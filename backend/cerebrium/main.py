from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
import io, os, zipfile, tempfile, shutil, unicodedata, base64, secrets

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.backends import default_backend

# === Load RSA Private Key ===
pem_data = base64.b64decode(os.environ["PRIVATE_KEY_BASE64"])
PRIVATE_KEY = serialization.load_pem_private_key(
    pem_data,
    password=None,
    backend=default_backend()
)

# === FastAPI Setup ===
app = FastAPI()

class Payload(BaseModel):
    encrypted_key: str
    file_ciphertext: str
    file_iv: str
    file_tag: str

# === AES Decryption ===
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

# === AES Encryption ===
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

# === DOCX Normalization ===
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

# === Actual API Endpoint ===
@app.post("/process_json")
def process_json(payload: Payload) -> Dict:
    try:
        encrypted_key = base64.b64decode(payload.encrypted_key)
        aes_key = PRIVATE_KEY.decrypt(
            encrypted_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        decrypted_bytes = decrypt_bytes_aes_gcm(
            payload.file_ciphertext,
            payload.file_iv,
            payload.file_tag,
            aes_key
        )

        input_stream = io.BytesIO(decrypted_bytes)
        processed_bytes = process_docx_zip_nfc(input_stream)

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
