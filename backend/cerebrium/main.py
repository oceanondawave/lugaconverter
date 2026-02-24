import io
import os
import zipfile
import tempfile
import shutil
import unicodedata
import base64
import secrets

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

# Initialize FastAPI app
app = FastAPI(title="Luga Converter API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class ProcessRequest(BaseModel):
    encrypted_key: str
    file_ciphertext: str
    file_iv: str
    file_tag: str


# === Load RSA Private Key from env ===
_PRIVATE_KEY = None

def get_private_key():
    global _PRIVATE_KEY
    if _PRIVATE_KEY is None:
        pem_data = base64.b64decode(os.environ["PRIVATE_KEY_BASE64"])
        _PRIVATE_KEY = serialization.load_pem_private_key(
            pem_data,
            password=None,
            backend=default_backend()
        )
    return _PRIVATE_KEY


def process_docx_zip_nfc(input_stream: io.BytesIO) -> bytes:
    temp_dir = tempfile.mkdtemp()
    try:
        with zipfile.ZipFile(input_stream, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)

        document_path = os.path.join(temp_dir, 'word', 'document.xml')
        if not os.path.exists(document_path):
            raise ValueError("Could not find 'word/document.xml' in DOCX.")

        with open(document_path, 'r', encoding='utf-8') as f:
            content = f.read()

        normalized_content = unicodedata.normalize('NFC', content)
        with open(document_path, 'w', encoding='utf-8') as f:
            f.write(normalized_content)

        output_stream = io.BytesIO()
        with zipfile.ZipFile(output_stream, 'w', zipfile.ZIP_DEFLATED) as zip_out:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    path = os.path.join(root, file)
                    arcname = os.path.relpath(path, temp_dir)
                    zip_out.write(path, arcname)

        output_stream.seek(0)
        return output_stream.read()
    finally:
        shutil.rmtree(temp_dir)
    
    return b""


def decrypt_bytes_aes_gcm(ciphertext_b64, iv_b64, tag_b64, key: bytes) -> bytes:
    ciphertext = base64.b64decode(ciphertext_b64)
    iv = base64.b64decode(iv_b64)
    tag = base64.b64decode(tag_b64)

    decryptor = Cipher(
        algorithms.AES(key),
        modes.GCM(iv, tag),
        backend=default_backend()
    ).decryptor()

    return decryptor.update(ciphertext) + decryptor.finalize()


def encrypt_bytes_aes_gcm(data: bytes, key: bytes) -> dict:
    iv = secrets.token_bytes(12)
    encryptor = Cipher(
        algorithms.AES(key),
        modes.GCM(iv),
        backend=default_backend()
    ).encryptor()

    ciphertext = encryptor.update(data) + encryptor.finalize()
    return {
        "iv": base64.b64encode(iv).decode("utf-8"),
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
        "tag": base64.b64encode(encryptor.tag).decode("utf-8")
    }


# 🚀 Core processing function
def process_json(
    encrypted_key: str,
    file_ciphertext: str,
    file_iv: str,
    file_tag: str
) -> dict:
    try:
        # 1. Decrypt AES key using RSA
        rsa_key = get_private_key()
        aes_key = rsa_key.decrypt(
            base64.b64decode(encrypted_key),
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        if len(aes_key) not in (16, 24, 32):
            return {"error": "Invalid AES key length. Must be 128, 192, or 256 bits."}

        # 2. Decrypt DOCX file
        decrypted_file = decrypt_bytes_aes_gcm(
            file_ciphertext,
            file_iv,
            file_tag,
            aes_key
        )

        # 3. Normalize DOCX file
        input_stream = io.BytesIO(decrypted_file)
        output_bytes = process_docx_zip_nfc(input_stream)

        # 4. Re-encrypt output
        encrypted = encrypt_bytes_aes_gcm(output_bytes, aes_key)

        return {
            "result": {
                "ciphertext": encrypted["ciphertext"],
                "iv": encrypted["iv"],
                "tag": encrypted["tag"]
            }
        }
    except Exception as e:
        return {"error": str(e)}


# FastAPI endpoints
@app.get("/health")
def health():
    """Health check endpoint for Cerebrium"""
    return {"status": "healthy"}


@app.get("/ready")
def ready():
    """Readiness check endpoint for Cerebrium"""
    return {"status": "ready"}


@app.post("/process_json")
async def process_json_endpoint(request: ProcessRequest):
    """
    Process DOCX file: decrypt, normalize Unicode (NFD to NFC), and re-encrypt.
    """
    result = process_json(
        encrypted_key=request.encrypted_key,
        file_ciphertext=request.file_ciphertext,
        file_iv=request.file_iv,
        file_tag=request.file_tag
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result
