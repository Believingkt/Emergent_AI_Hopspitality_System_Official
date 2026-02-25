"""PMS (Property Management System) API Client
Integrates with TravelMap/CID Distributor API for room availability and pricing.
Supports mock mode for development without API credentials.
"""
import httpx
import os
from datetime import datetime, timedelta
from typing import Optional

# PMS API Configuration
PMS_UAT_URL = "https://booking.travelmap.com.tw/api/CIDDistributor.ashx"
PMS_PROD_URL = "https://booking.taiwantravelmap.com/api/CIDDistributor.ashx"


class PMSClient:
    """Client for TravelMap CID Distributor API"""
    
    def __init__(self, account_id: str = "", password: str = "", cid_code: str = "LakezeEvent", 
                 use_production: bool = False, proxy_url: str = "", proxy_api_key: str = ""):
        self.account_id = account_id
        self.password = password
        self.cid_code = cid_code
        self.base_url = PMS_PROD_URL if use_production else PMS_UAT_URL
        self.proxy_url = proxy_url.rstrip("/") if proxy_url else ""
        self.proxy_api_key = proxy_api_key or "lakeze-pms-proxy-2025"
        self.use_mock = not (account_id and password)
    
    async def search_all(self, check_in: str, check_out: str) -> dict:
        """
        Search available rooms for given dates.
        Routes through proxy if proxy_url is configured.
        """
        if self.use_mock:
            print(f"[PMS] Using mock data (no API credentials)")
            return self._mock_search(check_in, check_out)
        
        payload = {
            "Control": "SearchAll",
            "CIDCode": self.cid_code,
            "CheckIn": check_in,
            "CheckOut": check_out
        }
        
        headers = {
            "AccountID": self.account_id,
            "Password": self.password,
            "Content-Type": "application/json"
        }
        
        try:
            # Route through proxy if configured
            if self.proxy_url:
                return await self._request_via_proxy(payload, headers)
            
            # Direct request (only works with whitelisted IP)
            async with httpx.AsyncClient(timeout=15) as client:
                print(f"[PMS] SearchAll: {check_in} ~ {check_out} (Direct: {self.base_url})")
                resp = await client.post(self.base_url, json=payload, headers=headers)
                
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("Status"):
                        print(f"[PMS] Success: {len(data.get('HostelList', []))} hotels found")
                        return data
                    else:
                        print(f"[PMS] API Error: {data.get('Message', 'Unknown error')}")
                        return {"Status": False, "Message": data.get("Message", "查詢失敗"), "HostelList": []}
                else:
                    print(f"[PMS] HTTP Error: {resp.status_code}")
                    return {"Status": False, "Message": f"HTTP {resp.status_code}", "HostelList": []}
        
        except Exception as e:
            print(f"[PMS] Request Error: {e}")
            return {"Status": False, "Message": str(e), "HostelList": []}
    
    async def _request_via_proxy(self, payload: dict, headers: dict) -> dict:
        """Send PMS request through the fixed-IP proxy server"""
        try:
            proxy_body = {
                "target_url": self.base_url,
                "payload": payload,
                "headers": headers
            }
            
            async with httpx.AsyncClient(timeout=20) as client:
                print(f"[PMS] SearchAll via proxy: {self.proxy_url}")
                resp = await client.post(
                    f"{self.proxy_url}/relay",
                    json=proxy_body,
                    headers={
                        "X-Proxy-Key": self.proxy_api_key,
                        "Content-Type": "application/json"
                    }
                )
                
                if resp.status_code == 200:
                    proxy_result = resp.json()
                    pms_data = proxy_result.get("body", {})
                    
                    if isinstance(pms_data, dict) and pms_data.get("Status"):
                        print(f"[PMS] Proxy success: {len(pms_data.get('HostelList', []))} hotels")
                        return pms_data
                    elif isinstance(pms_data, dict):
                        return {"Status": False, "Message": pms_data.get("Message", "查詢失敗"), "HostelList": []}
                    else:
                        return {"Status": False, "Message": "Unexpected response format", "HostelList": []}
                else:
                    print(f"[PMS] Proxy error: {resp.status_code} {resp.text}")
                    return {"Status": False, "Message": f"Proxy error: {resp.status_code}", "HostelList": []}
        
        except Exception as e:
            print(f"[PMS] Proxy request error: {e}")
            return {"Status": False, "Message": f"Proxy error: {str(e)}", "HostelList": []}
    
    def parse_rooms_summary(self, data: dict) -> list:
        """Parse API response into a simplified room list for AI consumption"""
        rooms = []
        
        for hotel in data.get("HostelList", []):
            hotel_name = self._get_text(hotel.get("Name", []))
            hotel_code = hotel.get("Code", "")
            
            for room in hotel.get("Rooms", []):
                room_name = self._get_text(room.get("Name", []))
                room_code = room.get("Code", "")
                rate_name = self._get_text(room.get("RateName", []))
                description = self._get_text(room.get("Description", []))
                
                # Pricing
                price_info = room.get("TotalPrice", {})
                price_before_tax = price_info.get("AmountBeforeTax", 0)
                price_after_tax = price_info.get("AmountAfterTax", 0)
                currency = price_info.get("CurrencyCode", "TWD")
                
                # Availability
                inventory = room.get("InventoryCount", 0)
                
                # Bed info
                beds = []
                for bed in room.get("BedConfigurations", []):
                    bed_desc = self._get_text(bed.get("Description", []))
                    bed_qty = bed.get("Quantity", 1)
                    beds.append(f"{bed_desc} x{bed_qty}")
                
                # Occupancy
                max_occ = room.get("MaxOccupancy", 0)
                base_occ = room.get("BaseOccupancy", room.get("Base Occupancy", 0))
                
                # Photos
                photos = [p.get("URL", "") for p in room.get("Photo", []) if p.get("URL")]
                
                # Amenities
                amenities = [self._get_text_single(a) for a in room.get("Amenities", [])]
                
                # Booking URL
                booking_url = room.get("BookingURL", "")
                
                # Check-in/out times
                check_in_time = room.get("CheckInStartTime", "")
                check_out_time = room.get("CheckOutEndTime", "")
                
                # Additional guests
                additional_guests = []
                for ag in room.get("AdditionalGuest", []):
                    age_code = ag.get("AgeCode", "")
                    amount = ag.get("Amount", 0)
                    age_label = "成人" if str(age_code) == "10" else f"{age_code}歲以下兒童"
                    additional_guests.append(f"加{age_label}: ${amount}")
                
                rooms.append({
                    "hotel_name": hotel_name,
                    "hotel_code": hotel_code,
                    "room_name": room_name,
                    "room_code": room_code,
                    "rate_name": rate_name,
                    "description": description[:100],
                    "price_before_tax": price_before_tax,
                    "price_after_tax": price_after_tax,
                    "currency": currency,
                    "inventory": inventory,
                    "beds": beds,
                    "max_occupancy": max_occ,
                    "base_occupancy": base_occ,
                    "photos": photos[:2],
                    "amenities": amenities[:5],
                    "booking_url": booking_url,
                    "check_in_time": check_in_time,
                    "check_out_time": check_out_time,
                    "additional_guests": additional_guests,
                    "check_in": room.get("CheckIn", ""),
                    "check_out": room.get("CheckOut", ""),
                })
        
        return rooms
    
    def format_for_ai(self, rooms: list) -> str:
        """Format room data as text for AI to use in conversation"""
        if not rooms:
            return "目前查無可用房型。"
        
        lines = []
        for r in rooms:
            avail = f"剩 {r['inventory']} 間" if r['inventory'] > 0 else "已滿房"
            beds_str = "、".join(r['beds']) if r['beds'] else ""
            
            line = (
                f"【{r['room_name']}】{r['rate_name']}\n"
                f"  價格：${r['price_after_tax']:,.0f}（含稅）/ {r['currency']}\n"
                f"  庫存：{avail}\n"
                f"  入住人數：{r['base_occupancy']}~{r['max_occupancy']} 人\n"
                f"  床型：{beds_str}\n"
                f"  入住日期：{r['check_in']} ~ {r['check_out']}"
            )
            
            if r['additional_guests']:
                line += f"\n  加人費用：{'、'.join(r['additional_guests'])}"
            
            if r['booking_url']:
                line += f"\n  訂房連結：{r['booking_url']}"
            
            lines.append(line)
        
        return "\n\n".join(lines)
    
    def _get_text(self, lang_items: list, lang: str = "zh-tw") -> str:
        """Extract text from LanguageItem array"""
        for item in lang_items:
            if isinstance(item, dict):
                if item.get("Language", "").lower() == lang or item.get("language", "").lower() == lang:
                    return item.get("text", "") or item.get("Text", "")
        # Fallback to first item
        if lang_items and isinstance(lang_items[0], dict):
            return lang_items[0].get("text", "") or lang_items[0].get("Text", "")
        return ""
    
    def _get_text_single(self, item: dict, lang: str = "zh-tw") -> str:
        """Extract text from a single LanguageItem"""
        if isinstance(item, dict):
            return item.get("text", "") or item.get("Text", "")
        return ""
    
    def _mock_search(self, check_in: str, check_out: str) -> dict:
        """Generate mock data for development"""
        return {
            "Status": True,
            "Message": "",
            "HostelList": [
                {
                    "Code": "TIANSONG",
                    "Name": [{"Language": "zh-tw", "text": "天送幸福和苑"}],
                    "Description": [{"Language": "zh-tw", "text": "位於宜蘭的溫馨民宿，享受田園風光與溫泉。"}],
                    "Address": [{"Language": "zh-tw", "Area": "三星鄉", "City": "宜蘭縣", "Address": "天送埤路123號"}],
                    "Email": "tiansong@example.com",
                    "Phone": "+886-3-989-1234",
                    "CheckInStartTime": [{"Type": "weekday", "Time": "15:00"}],
                    "CheckOutEndTime": [{"Type": "weekday", "Time": "11:00"}],
                    "BookingURL": f"https://booking.travelmap.com.tw/user/booking.aspx?m=TIANSONG&cid=LakezeEvent",
                    "Taxs": [{"Name": [{"Language": "zh-tw", "text": "營業稅"}], "Category": "Tax", "Rate": 0.05, "CurrencyCode": "TWD"}],
                    "Photo": [{"URL": "https://via.placeholder.com/400x300?text=天送幸福和苑", "Description": []}],
                    "Amenities": [
                        {"Language": "zh-tw", "text": "免費停車場"},
                        {"Language": "zh-tw", "text": "溫泉"},
                        {"Language": "zh-tw", "text": "免費 WiFi"}
                    ],
                    "Rooms": [
                        {
                            "Code": "R001",
                            "Name": [{"Language": "zh-tw", "text": "幸福雙人房"}],
                            "BedConfigurations": [{"Description": [{"Language": "zh-tw", "text": "雙人床"}], "Quantity": 1}],
                            "Description": [{"Language": "zh-tw", "text": "溫馨雙人房，含私人溫泉池，享受浪漫田園風光。"}],
                            "UnitOfSale": "ROOM",
                            "RateCode": "ROOM",
                            "RateName": [{"Language": "zh-tw", "text": "標準房價"}],
                            "RateDescription": [],
                            "MaxOccupancy": 2,
                            "BaseOccupancy": 2,
                            "AdditionalGuest": [],
                            "MinStayDays": 1,
                            "MinBookingRoomCount": 1,
                            "BookingURL": f"https://booking.travelmap.com.tw/user/order.aspx?m=TIANSONG&r=R001&checkin={check_in}&checkout={check_out}",
                            "CheckIn": check_in,
                            "CheckOut": check_out,
                            "CheckInStartTime": "15:00",
                            "CheckOutEndTime": "11:00",
                            "Count": 1,
                            "InventoryCount": 3,
                            "TotalPrice": {"AmountBeforeTax": 3500.0, "AmountAfterTax": 3675.0, "CurrencyCode": "TWD"},
                            "Photo": [{"URL": "https://via.placeholder.com/400x300?text=幸福雙人房", "Description": []}],
                            "Amenities": [
                                {"Language": "zh-tw", "text": "私人溫泉"},
                                {"Language": "zh-tw", "text": "冰箱"},
                                {"Language": "zh-tw", "text": "免費 WiFi"}
                            ]
                        },
                        {
                            "Code": "R002",
                            "Name": [{"Language": "zh-tw", "text": "和苑四人房"}],
                            "BedConfigurations": [{"Description": [{"Language": "zh-tw", "text": "雙人床"}], "Quantity": 2}],
                            "Description": [{"Language": "zh-tw", "text": "寬敞四人房，適合家庭出遊，含獨立衛浴和陽台。"}],
                            "UnitOfSale": "ROOM",
                            "RateCode": "ROOM",
                            "RateName": [{"Language": "zh-tw", "text": "標準房價"}],
                            "RateDescription": [],
                            "MaxOccupancy": 4,
                            "BaseOccupancy": 4,
                            "AdditionalGuest": [
                                {"AgeCode": "10", "Amount": 800.0, "CurrencyCode": "TWD"},
                                {"AgeCode": "8", "Amount": 400.0, "CurrencyCode": "TWD"}
                            ],
                            "MinStayDays": 1,
                            "MinBookingRoomCount": 1,
                            "BookingURL": f"https://booking.travelmap.com.tw/user/order.aspx?m=TIANSONG&r=R002&checkin={check_in}&checkout={check_out}",
                            "CheckIn": check_in,
                            "CheckOut": check_out,
                            "CheckInStartTime": "15:00",
                            "CheckOutEndTime": "11:00",
                            "Count": 1,
                            "InventoryCount": 2,
                            "TotalPrice": {"AmountBeforeTax": 5800.0, "AmountAfterTax": 6090.0, "CurrencyCode": "TWD"},
                            "Photo": [{"URL": "https://via.placeholder.com/400x300?text=和苑四人房", "Description": []}],
                            "Amenities": [
                                {"Language": "zh-tw", "text": "私人溫泉"},
                                {"Language": "zh-tw", "text": "陽台"},
                                {"Language": "zh-tw", "text": "冰箱"},
                                {"Language": "zh-tw", "text": "免費 WiFi"}
                            ]
                        },
                        {
                            "Code": "R003",
                            "Name": [{"Language": "zh-tw", "text": "天送包棟Villa"}],
                            "BedConfigurations": [
                                {"Description": [{"Language": "zh-tw", "text": "雙人床"}], "Quantity": 3},
                                {"Description": [{"Language": "zh-tw", "text": "單人床"}], "Quantity": 2}
                            ],
                            "Description": [{"Language": "zh-tw", "text": "獨棟Villa，3間臥室可住8人，含獨立客廳、廚房和庭院烤肉區。"}],
                            "UnitOfSale": "ROOM",
                            "RateCode": "VILLA",
                            "RateName": [{"Language": "zh-tw", "text": "包棟方案"}],
                            "RateDescription": [{"Language": "zh-tw", "text": "含早餐、下午茶、烤肉設備"}],
                            "MaxOccupancy": 8,
                            "BaseOccupancy": 6,
                            "AdditionalGuest": [
                                {"AgeCode": "10", "Amount": 1000.0, "CurrencyCode": "TWD"},
                                {"AgeCode": "8", "Amount": 500.0, "CurrencyCode": "TWD"}
                            ],
                            "MinStayDays": 1,
                            "MinBookingRoomCount": 1,
                            "BookingURL": f"https://booking.travelmap.com.tw/user/order.aspx?m=TIANSONG&r=R003&checkin={check_in}&checkout={check_out}",
                            "CheckIn": check_in,
                            "CheckOut": check_out,
                            "CheckInStartTime": "15:00",
                            "CheckOutEndTime": "11:00",
                            "Count": 1,
                            "InventoryCount": 1,
                            "TotalPrice": {"AmountBeforeTax": 12000.0, "AmountAfterTax": 12600.0, "CurrencyCode": "TWD"},
                            "Photo": [{"URL": "https://via.placeholder.com/400x300?text=天送包棟Villa", "Description": []}],
                            "Amenities": [
                                {"Language": "zh-tw", "text": "獨立庭院"},
                                {"Language": "zh-tw", "text": "烤肉區"},
                                {"Language": "zh-tw", "text": "廚房"},
                                {"Language": "zh-tw", "text": "免費停車"}
                            ]
                        }
                    ]
                }
            ]
        }


async def get_pms_client(venue_id: str, venues_col) -> PMSClient:
    """Get PMS client for a venue from database config"""
    venue = await venues_col.find_one({"id": venue_id})
    if not venue or not venue.get("pms_config"):
        return PMSClient()  # Mock mode
    
    config = venue["pms_config"]
    return PMSClient(
        account_id=config.get("account_id", ""),
        password=config.get("password", ""),
        cid_code=config.get("cid_code", "LakezeEvent"),
        use_production=config.get("use_production", False),
        proxy_url=config.get("proxy_url", ""),
        proxy_api_key=config.get("proxy_api_key", ""),
    )
