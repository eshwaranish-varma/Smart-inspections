from __future__ import annotations
import logging
import io
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class OCRService:
    @staticmethod
    def process_image(image_bytes: bytes, is_handwritten: bool = False) -> dict:
        """OCR an image. Returns {text_blocks, full_text, low_confidence_blocks}."""
        try:
            import pytesseract
            from PIL import Image
            import numpy as np
        except ImportError as e:
            return {"text_blocks": [], "full_text": "", "low_confidence_blocks": [], "error": str(e)}
        
        img = Image.open(io.BytesIO(image_bytes))
        
        if is_handwritten:
            try:
                import cv2
                arr = np.array(img)
                gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY) if len(arr.shape) == 3 else arr
                gray = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15)
                gray = cv2.medianBlur(gray, 3)
                img = Image.fromarray(gray)
            except ImportError:
                pass
        
        config = "--psm 11" if is_handwritten else "--psm 6"
        
        try:
            data = pytesseract.image_to_data(img, config=config, output_type=pytesseract.Output.DICT)
        except Exception as e:
            try:
                text = pytesseract.image_to_string(img, config=config)
                return {"text_blocks": [{"text": text, "confidence": 80.0}], "full_text": text, "low_confidence_blocks": []}
            except Exception:
                return {"text_blocks": [], "full_text": "", "low_confidence_blocks": [], "error": str(e)}
        
        text_blocks = []
        low_conf = []
        full_parts = []
        
        for i, text in enumerate(data.get("text", [])):
            text = str(text).strip()
            if not text:
                continue
            conf = float(data["conf"][i]) if data["conf"][i] != -1 else 0.0
            block = {"text": text, "confidence": conf}
            text_blocks.append(block)
            full_parts.append(text)
            if conf < 60.0:
                low_conf.append(block)
        
        return {
            "text_blocks": text_blocks,
            "full_text": " ".join(full_parts),
            "low_confidence_blocks": low_conf,
        }
    
    @staticmethod
    def process_pdf(pdf_bytes: bytes) -> dict:
        """Extract text from PDF using PyMuPDF, falling back to OCR for scanned pages."""
        try:
            import fitz
        except ImportError:
            return {"text_blocks": [], "full_text": "", "low_confidence_blocks": [], "error": "PyMuPDF not installed"}
        
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        all_blocks = []
        full_parts = []
        low_conf = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text() or ""
            
            if len(text.strip()) < 40:
                mat = fitz.Matrix(300/72, 300/72)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_bytes = pix.tobytes("png")
                result = OCRService.process_image(img_bytes)
                text = result["full_text"]
                conf = 70.0
                low_conf.extend(result.get("low_confidence_blocks", []))
            else:
                conf = 95.0
            
            if text.strip():
                block = {"text": text.strip(), "confidence": conf, "page": page_num + 1}
                all_blocks.append(block)
                full_parts.append(text.strip())
        
        doc.close()
        return {
            "text_blocks": all_blocks,
            "full_text": "\n\n".join(full_parts),
            "low_confidence_blocks": low_conf,
        }
