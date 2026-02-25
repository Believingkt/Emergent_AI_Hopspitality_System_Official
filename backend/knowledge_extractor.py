"""Multi-format Knowledge Extractor using Claude AI
Supports: PDF, Word (.docx), Images (.jpg/.png/.webp), Markdown (.md), ZIP
"""
import io
import os
import zipfile
import base64
import anthropic
from typing import Optional


SUPPORTED_EXTENSIONS = {
    'pdf', 'docx', 'doc',
    'jpg', 'jpeg', 'png', 'webp', 'gif',
    'md', 'txt',
    'zip'
}

IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
IMAGE_MEDIA_TYPES = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'png': 'image/png', 'webp': 'image/webp', 'gif': 'image/gif'
}


def get_file_extension(filename: str) -> str:
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


async def extract_text_from_file(file_bytes: bytes, filename: str) -> dict:
    """Extract text content from various file types.
    Returns: {"text": str, "type": str, "image_data": Optional[dict]}
    """
    ext = get_file_extension(filename)
    
    if ext == 'pdf':
        return await extract_pdf(file_bytes)
    elif ext in ('docx', 'doc'):
        return await extract_docx(file_bytes)
    elif ext in IMAGE_EXTENSIONS:
        return extract_image(file_bytes, ext)
    elif ext in ('md', 'txt'):
        return extract_text(file_bytes)
    elif ext == 'zip':
        return await extract_zip(file_bytes)
    else:
        return {"text": "", "type": "unsupported", "error": f"不支援的檔案格式: .{ext}"}


async def extract_pdf(file_bytes: bytes) -> dict:
    import pdfplumber
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
    except Exception as e:
        return {"text": "", "type": "pdf", "error": f"PDF 解析失敗: {str(e)}"}
    
    if not text.strip():
        return {"text": "", "type": "pdf", "error": "無法從 PDF 擷取文字（可能是掃描檔）"}
    
    return {"text": text.strip(), "type": "pdf"}


async def extract_docx(file_bytes: bytes) -> dict:
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = []
        for para in doc.paragraphs:
            if para.text.strip():
                paragraphs.append(para.text.strip())
        
        # Also extract tables
        for table in doc.tables:
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if cells:
                    paragraphs.append(" | ".join(cells))
        
        text = "\n".join(paragraphs)
        if not text.strip():
            return {"text": "", "type": "docx", "error": "Word 文件內容為空"}
        return {"text": text, "type": "docx"}
    except Exception as e:
        return {"text": "", "type": "docx", "error": f"Word 解析失敗: {str(e)}"}


def extract_image(file_bytes: bytes, ext: str) -> dict:
    """For images, return base64 data for Claude Vision"""
    media_type = IMAGE_MEDIA_TYPES.get(ext, 'image/jpeg')
    b64 = base64.standard_b64encode(file_bytes).decode('utf-8')
    return {
        "text": "",
        "type": "image",
        "image_data": {
            "media_type": media_type,
            "base64": b64
        }
    }


def extract_text(file_bytes: bytes) -> dict:
    try:
        text = file_bytes.decode('utf-8')
    except UnicodeDecodeError:
        try:
            text = file_bytes.decode('big5')
        except:
            text = file_bytes.decode('utf-8', errors='ignore')
    return {"text": text, "type": "text"}


async def extract_zip(file_bytes: bytes) -> dict:
    """Extract ZIP and process each supported file inside"""
    all_texts = []
    all_images = []
    
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            for name in zf.namelist():
                if name.startswith('__MACOSX') or name.startswith('.'):
                    continue
                ext = get_file_extension(name)
                if ext not in SUPPORTED_EXTENSIONS or ext == 'zip':
                    continue
                
                with zf.open(name) as f:
                    content = f.read()
                    result = await extract_text_from_file(content, name)
                    
                    if result.get("text"):
                        all_texts.append(f"=== {name} ===\n{result['text']}")
                    if result.get("image_data"):
                        all_images.append({"filename": name, **result["image_data"]})
        
        combined = "\n\n".join(all_texts)
        result = {"text": combined, "type": "zip"}
        if all_images:
            result["images"] = all_images
        if not combined and not all_images:
            result["error"] = "ZIP 內無可解析的檔案"
        return result
    except Exception as e:
        return {"text": "", "type": "zip", "error": f"ZIP 解壓失敗: {str(e)}"}


async def claude_extract_knowledge(
    text: str = "",
    image_data: Optional[dict] = None,
    images: Optional[list] = None,
    api_key: str = "",
    source_filename: str = "",
) -> list:
    """Use Claude to extract knowledge items from text and/or images"""
    
    if not api_key:
        raise ValueError("Claude API key not configured")
    
    client = anthropic.Anthropic(api_key=api_key)
    
    system_prompt = """你是一個專業的知識提取助手。請從提供的內容中提取獨立的知識點。

每個知識點需包含：
- title: 簡短標題（10-20字）
- content: 完整內容（保留重要細節，用通順的中文描述）
- category: 分類，必須是以下之一：pricing（價格）、facility（設施）、rules（規則）、dining（餐飲）、service（服務）、location（交通位置）、other（其他）

注意：
- 把零散的資訊整理成有意義的知識條目
- 每個知識點要完整獨立，不要互相依賴
- 去除無關的頁首頁尾、頁碼等雜訊
- 保留具體的數字、價格、時間等重要資訊
- 如果是圖片，描述圖片中的關鍵資訊

回傳 JSON 陣列格式：
[{"title": "...", "content": "...", "category": "pricing"}]

只回傳 JSON，不要其他文字。"""

    # Build message content
    content_parts = []
    
    if text:
        truncated = text[:8000]
        if len(text) > 8000:
            truncated += "\n\n[...內容已截斷]"
        content_parts.append({
            "type": "text",
            "text": f"以下是文件「{source_filename}」的內容：\n\n{truncated}"
        })
    
    # Add image(s)
    if image_data:
        content_parts.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_data["media_type"],
                "data": image_data["base64"]
            }
        })
        if not text:
            content_parts.append({
                "type": "text",
                "text": f"請分析上方圖片「{source_filename}」中的內容，提取知識點。"
            })
    
    if images:
        for img in images[:5]:  # Max 5 images
            content_parts.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img["media_type"],
                    "data": img["base64"]
                }
            })
        content_parts.append({
            "type": "text",
            "text": f"請一併分析上方 {len(images)} 張圖片中的內容。"
        })
    
    if not content_parts:
        return []
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        system=system_prompt,
        messages=[{"role": "user", "content": content_parts}]
    )
    
    result_text = response.content[0].text.strip()
    
    # Parse JSON
    import json
    if result_text.startswith("```"):
        result_text = result_text.split("```")[1]
        if result_text.startswith("json"):
            result_text = result_text[4:]
    
    return json.loads(result_text)
