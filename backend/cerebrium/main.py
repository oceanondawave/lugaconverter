import io
import os
import zipfile
import tempfile
import shutil
import unicodedata
import base64
import secrets

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization, hashes

# Load private RSA key (once at start)
with open("private_key.pem", "rb") as key_file:
    PRIVATE_KEY = serialization.load_pem_private_key(
        key_file.read(),
        password=None,
        backend=default_backend()
    )

# === AES-GCM Helpers ===

def decrypt_bytes_aes_gcm(ciphertext_b64, iv_b64, tag_b64, key):
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
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
        "iv": base64.b64encode(iv).decode("utf-8"),
        "tag": base64.b64encode(encryptor.tag).decode("utf-8")
    }

# === DOCX Processor ===

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

# === Cerebrium entry point ===

def process_json(payload: dict) -> dict:
    try:
        # 1. Decrypt AES key with RSA
        encrypted_aes_key_b64 = payload["encrypted_key"]
        encrypted_key = base64.b64decode(encrypted_aes_key_b64)

        aes_key = PRIVATE_KEY.decrypt(
            encrypted_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        if len(aes_key) not in (16, 24, 32):
            return {"error": "Invalid AES key length."}

        # 2. Decrypt DOCX file using AES key
        decrypted_bytes = decrypt_bytes_aes_gcm(
            ciphertext_b64=payload["file_ciphertext"],
            iv_b64=payload["file_iv"],
            tag_b64=payload["file_tag"],
            key=aes_key
        )

        input_stream = io.BytesIO(decrypted_bytes)
        processed_bytes = process_docx_zip_nfc(input_stream)

        # 3. Encrypt output (re-use AES key or generate new one)
        encrypted_output = encrypt_bytes_aes_gcm(processed_bytes, aes_key)

        return {
            "result": {
                "ciphertext": encrypted_output["ciphertext"],
                "iv": encrypted_output["iv"],
                "tag": encrypted_output["tag"]
            }
        }

    except Exception as e:
        return {"error": str(e)}
