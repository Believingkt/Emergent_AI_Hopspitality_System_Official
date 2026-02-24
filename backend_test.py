#!/usr/bin/env python3
"""
Lakeze Backend API Testing Suite
Tests all critical backend APIs including Venue CRUD and Avatar Upload
"""

import requests
import json
import os
import io
from PIL import Image
import time
import sys

# Backend URL from frontend .env
BACKEND_URL = "https://repo-data-pull.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "kenneth@lakeze.com"
TEST_PASSWORD = "lakeze2026"

class BackendTester:
    def __init__(self):
        self.token = None
        self.user_info = None
        self.created_venues = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "details": []
        }
    
    def log(self, message, is_error=False):
        """Log test messages"""
        prefix = "❌ ERROR" if is_error else "✅ INFO"
        print(f"{prefix}: {message}")
        
    def assert_test(self, condition, test_name, details=""):
        """Assert a test condition and record results"""
        if condition:
            self.test_results["passed"] += 1
            self.log(f"PASS: {test_name}")
            self.test_results["details"].append({
                "test": test_name,
                "status": "PASS",
                "details": details
            })
            return True
        else:
            self.test_results["failed"] += 1
            self.log(f"FAIL: {test_name} - {details}", is_error=True)
            self.test_results["details"].append({
                "test": test_name,
                "status": "FAIL", 
                "details": details
            })
            return False

    def test_health_check(self):
        """Test health endpoint"""
        self.log("Testing health check endpoint...")
        try:
            response = requests.get(f"{API_BASE}/health", timeout=10)
            self.assert_test(
                response.status_code == 200,
                "Health Check",
                f"Status: {response.status_code}, Response: {response.text[:200]}"
            )
            if response.status_code == 200:
                data = response.json()
                self.assert_test(
                    data.get("status") == "healthy",
                    "Health Status Check",
                    f"Status: {data.get('status')}"
                )
        except Exception as e:
            self.assert_test(
                False,
                "Health Check",
                f"Connection failed: {str(e)}"
            )

    def test_login(self):
        """Test login endpoint and get JWT token"""
        self.log("Testing login endpoint...")
        try:
            payload = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = requests.post(
                f"{API_BASE}/auth/login",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            success = self.assert_test(
                response.status_code == 200,
                "Login Authentication",
                f"Status: {response.status_code}, Response: {response.text[:300]}"
            )
            
            if success:
                data = response.json()
                self.token = data.get("access_token")
                self.user_info = data.get("user", {})
                
                self.assert_test(
                    self.token is not None,
                    "JWT Token Received",
                    f"Token present: {bool(self.token)}"
                )
                
                self.assert_test(
                    self.user_info.get("email") == TEST_EMAIL,
                    "User Info Validation",
                    f"Email: {self.user_info.get('email')}, Role: {self.user_info.get('role')}"
                )
                
        except Exception as e:
            self.assert_test(
                False,
                "Login Authentication",
                f"Login failed: {str(e)}"
            )

    def get_auth_headers(self):
        """Get authentication headers with Bearer token"""
        if not self.token:
            return {}
        return {"Authorization": f"Bearer {self.token}"}

    def test_auth_me(self):
        """Test authenticated user info endpoint"""
        self.log("Testing /auth/me endpoint...")
        if not self.token:
            self.assert_test(False, "Auth Me Check", "No token available")
            return
            
        try:
            response = requests.get(
                f"{API_BASE}/auth/me",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            success = self.assert_test(
                response.status_code == 200,
                "Auth Me Endpoint",
                f"Status: {response.status_code}"
            )
            
            if success:
                data = response.json()
                user = data.get("user", {})
                self.assert_test(
                    user.get("email") == TEST_EMAIL,
                    "Auth Me User Data",
                    f"User email: {user.get('email')}"
                )
        except Exception as e:
            self.assert_test(
                False,
                "Auth Me Endpoint",
                f"Request failed: {str(e)}"
            )

    def test_get_venues(self):
        """Test get venues endpoint"""
        self.log("Testing GET /venues endpoint...")
        if not self.token:
            self.assert_test(False, "Get Venues", "No token available")
            return None
            
        try:
            response = requests.get(
                f"{API_BASE}/venues",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            success = self.assert_test(
                response.status_code == 200,
                "Get Venues Endpoint",
                f"Status: {response.status_code}"
            )
            
            venues = []
            if success:
                data = response.json()
                venues = data.get("venues", [])
                
                self.assert_test(
                    isinstance(venues, list),
                    "Venues Data Format",
                    f"Venues count: {len(venues)}"
                )
                
                # Check venue structure if venues exist
                if venues:
                    venue = venues[0]
                    required_fields = ["id", "name", "avatar_url"]
                    has_fields = all(field in venue for field in required_fields)
                    
                    self.assert_test(
                        has_fields,
                        "Venue Data Structure",
                        f"Has required fields: {required_fields}, Sample: {venue}"
                    )
                    
            return venues
            
        except Exception as e:
            self.assert_test(
                False,
                "Get Venues Endpoint",
                f"Request failed: {str(e)}"
            )
            return []

    def test_create_venue(self):
        """Test create venue endpoint"""
        self.log("Testing POST /venues endpoint...")
        if not self.token:
            self.assert_test(False, "Create Venue", "No token available")
            return None
            
        try:
            response = requests.post(
                f"{API_BASE}/venues",
                headers=self.get_auth_headers(),
                json={},  # Empty body - endpoint creates with default name
                timeout=10
            )
            
            success = self.assert_test(
                response.status_code == 200,
                "Create Venue Endpoint",
                f"Status: {response.status_code}, Response: {response.text[:300]}"
            )
            
            venue_data = None
            if success:
                data = response.json()
                venue_data = data.get("venue", {})
                venue_id = venue_data.get("id")
                
                if venue_id:
                    self.created_venues.append(venue_id)
                
                self.assert_test(
                    data.get("success") is True,
                    "Create Venue Success Flag",
                    f"Success: {data.get('success')}"
                )
                
                self.assert_test(
                    venue_data.get("name") == "新場域",
                    "Default Venue Name",
                    f"Name: {venue_data.get('name')}"
                )
                
                self.assert_test(
                    venue_data.get("avatar_url") == "",
                    "Empty Avatar URL",
                    f"Avatar URL: '{venue_data.get('avatar_url')}'"
                )
                
            return venue_data
            
        except Exception as e:
            self.assert_test(
                False,
                "Create Venue Endpoint",
                f"Request failed: {str(e)}"
            )
            return None

    def test_update_venue(self, venue_id):
        """Test update venue name endpoint"""
        self.log(f"Testing PUT /venues/{venue_id} endpoint...")
        if not self.token or not venue_id:
            self.assert_test(False, "Update Venue", "No token or venue_id available")
            return None
            
        try:
            test_name = "測試場域"
            test_description = "這是測試描述"
            
            payload = {
                "name": test_name,
                "description": test_description
            }
            
            response = requests.put(
                f"{API_BASE}/venues/{venue_id}",
                headers=self.get_auth_headers(),
                json=payload,
                timeout=10
            )
            
            success = self.assert_test(
                response.status_code == 200,
                "Update Venue Endpoint",
                f"Status: {response.status_code}, Response: {response.text[:300]}"
            )
            
            venue_data = None
            if success:
                data = response.json()
                venue_data = data.get("venue", {})
                
                self.assert_test(
                    data.get("success") is True,
                    "Update Venue Success Flag",
                    f"Success: {data.get('success')}"
                )
                
                self.assert_test(
                    venue_data.get("name") == test_name,
                    "Updated Venue Name",
                    f"Expected: {test_name}, Got: {venue_data.get('name')}"
                )
                
                self.assert_test(
                    venue_data.get("description") == test_description,
                    "Updated Venue Description", 
                    f"Expected: {test_description}, Got: {venue_data.get('description')}"
                )
                
            return venue_data
            
        except Exception as e:
            self.assert_test(
                False,
                "Update Venue Endpoint",
                f"Request failed: {str(e)}"
            )
            return None

    def create_test_image(self):
        """Create a test image for avatar upload"""
        try:
            # Create a simple test image
            img = Image.new('RGB', (100, 100), color='red')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            return img_bytes
        except Exception as e:
            self.log(f"Failed to create test image: {e}", is_error=True)
            return None

    def test_upload_avatar(self, venue_id):
        """Test venue avatar upload endpoint"""
        self.log(f"Testing POST /venues/{venue_id}/avatar endpoint...")
        if not self.token or not venue_id:
            self.assert_test(False, "Upload Avatar", "No token or venue_id available")
            return None
            
        try:
            # Create test image
            img_data = self.create_test_image()
            if not img_data:
                self.assert_test(False, "Upload Avatar", "Failed to create test image")
                return None
            
            files = {
                'file': ('test_avatar.png', img_data, 'image/png')
            }
            
            response = requests.post(
                f"{API_BASE}/venues/{venue_id}/avatar",
                headers=self.get_auth_headers(),
                files=files,
                timeout=15
            )
            
            success = self.assert_test(
                response.status_code == 200,
                "Upload Avatar Endpoint",
                f"Status: {response.status_code}, Response: {response.text[:300]}"
            )
            
            avatar_url = None
            if success:
                data = response.json()
                avatar_url = data.get("avatar_url", "")
                
                self.assert_test(
                    data.get("success") is True,
                    "Upload Avatar Success Flag",
                    f"Success: {data.get('success')}"
                )
                
                self.assert_test(
                    avatar_url.startswith("/api/uploads/"),
                    "Avatar URL Format",
                    f"Avatar URL: {avatar_url}"
                )
                
            return avatar_url
            
        except Exception as e:
            self.assert_test(
                False,
                "Upload Avatar Endpoint",
                f"Request failed: {str(e)}"
            )
            return None

    def test_verify_avatar_in_venues(self, venue_id, expected_avatar_url):
        """Verify avatar URL appears in venues list"""
        self.log("Verifying avatar URL in venues list...")
        if not expected_avatar_url:
            self.assert_test(False, "Verify Avatar in Venues", "No expected avatar URL")
            return
            
        try:
            response = requests.get(
                f"{API_BASE}/venues",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                venues = data.get("venues", [])
                
                # Find our venue
                target_venue = None
                for venue in venues:
                    if venue.get("id") == venue_id:
                        target_venue = venue
                        break
                
                if target_venue:
                    actual_avatar = target_venue.get("avatar_url", "")
                    self.assert_test(
                        actual_avatar == expected_avatar_url,
                        "Avatar URL in Venues List",
                        f"Expected: {expected_avatar_url}, Got: {actual_avatar}"
                    )
                else:
                    self.assert_test(
                        False,
                        "Avatar URL in Venues List",
                        f"Venue {venue_id} not found in venues list"
                    )
            else:
                self.assert_test(
                    False,
                    "Avatar URL in Venues List",
                    f"Failed to get venues: {response.status_code}"
                )
                
        except Exception as e:
            self.assert_test(
                False,
                "Avatar URL in Venues List",
                f"Request failed: {str(e)}"
            )

    def test_knowledge_endpoints(self):
        """Test knowledge CRUD endpoints"""
        self.log("Testing knowledge endpoints...")
        
        if not self.created_venues:
            self.assert_test(False, "Knowledge Tests", "No created venue for testing")
            return
            
        venue_id = self.created_venues[0]
        
        try:
            # Test GET knowledge (empty initially)
            response = requests.get(
                f"{API_BASE}/venues/{venue_id}/knowledge",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            self.assert_test(
                response.status_code == 200,
                "Get Knowledge Endpoint",
                f"Status: {response.status_code}"
            )
            
            # Test CREATE knowledge
            knowledge_payload = {
                "title": "測試知識",
                "content": "這是一個測試知識項目的內容",
                "category": "other"
            }
            
            response = requests.post(
                f"{API_BASE}/venues/{venue_id}/knowledge", 
                headers=self.get_auth_headers(),
                json=knowledge_payload,
                timeout=10
            )
            
            create_success = self.assert_test(
                response.status_code == 200,
                "Create Knowledge Endpoint",
                f"Status: {response.status_code}"
            )
            
            if create_success:
                data = response.json()
                self.assert_test(
                    data.get("success") is True,
                    "Create Knowledge Success",
                    f"Knowledge created: {data.get('knowledge', {}).get('title')}"
                )
                
        except Exception as e:
            self.assert_test(
                False,
                "Knowledge Endpoints",
                f"Request failed: {str(e)}"
            )

    def test_tasks_endpoints(self):
        """Test tasks endpoints"""
        self.log("Testing tasks endpoints...")
        
        try:
            # Test GET tasks
            response = requests.get(
                f"{API_BASE}/tasks",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            self.assert_test(
                response.status_code == 200,
                "Get Tasks Endpoint",
                f"Status: {response.status_code}"
            )
            
            # Test GET grouped tasks
            response = requests.get(
                f"{API_BASE}/tasks/grouped",
                headers=self.get_auth_headers(),
                timeout=10
            )
            
            self.assert_test(
                response.status_code == 200,
                "Get Grouped Tasks Endpoint", 
                f"Status: {response.status_code}"
            )
            
        except Exception as e:
            self.assert_test(
                False,
                "Tasks Endpoints",
                f"Request failed: {str(e)}"
            )

    def run_all_tests(self):
        """Run all backend tests"""
        self.log("Starting Lakeze Backend API Tests...")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        # Core tests
        self.test_health_check()
        self.test_login()
        
        if self.token:
            self.test_auth_me()
            
            # Get existing venues first
            existing_venues = self.test_get_venues()
            
            # Create new venue
            new_venue = self.test_create_venue()
            
            if new_venue and new_venue.get("id"):
                venue_id = new_venue["id"]
                
                # Update venue name
                updated_venue = self.test_update_venue(venue_id)
                
                # Upload avatar
                avatar_url = self.test_upload_avatar(venue_id)
                
                # Verify avatar in venues list
                if avatar_url:
                    self.test_verify_avatar_in_venues(venue_id, avatar_url)
                
            # Test other endpoints
            self.test_knowledge_endpoints()
            self.test_tasks_endpoints()
        
        # Print final results
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        total = self.test_results["passed"] + self.test_results["failed"]
        
        print("\n" + "="*60)
        print("LAKEZE BACKEND API TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results["failed"] > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results["details"]:
                if result["status"] == "FAIL":
                    print(f"❌ {result['test']}: {result['details']}")
        
        print(f"\nSuccess Rate: {(self.test_results['passed']/total*100):.1f}%" if total > 0 else "No tests run")
        print("="*60)
        
        return self.test_results["failed"] == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)