import io
import os
import zipfile
import tempfile
import shutil
import unicodedata
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import secrets


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


def encrypt_bytes_aes_gcm(data: bytes, key: bytes) -> dict:
    iv = secrets.token_bytes(12)  # 96-bit nonce
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


# 🚀 Entry function for Cerebrium
def process_json(file_base64: str, key_base64: str) -> dict:
    try:
        file_bytes = base64.b64decode(file_base64)
        aes_key = base64.b64decode(key_base64)

        if len(aes_key) not in (16, 24, 32):
            return {"error": "Invalid AES key length. Use 128/192/256 bits."}

        input_stream = io.BytesIO(file_bytes)
        output_bytes = process_docx_zip_nfc(input_stream)

        encrypted = encrypt_bytes_aes_gcm(output_bytes, aes_key)

        return {
            "encrypted_file": encrypted["ciphertext"],
            "iv": encrypted["iv"],
            "tag": encrypted["tag"]
        }
    except Exception as e:
        return {"error": str(e)}
