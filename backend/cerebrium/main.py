import io
import os
import zipfile
import tempfile
import shutil
import unicodedata
import base64


def process_docx_zip_nfc(input_stream: io.BytesIO) -> bytes:
    temp_dir = tempfile.mkdtemp()
    try:
        # Unzip the .docx (it's a zip file)
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

        # Re-zip into memory
        output_stream = io.BytesIO()
        with zipfile.ZipFile(output_stream, 'w', zipfile.ZIP_DEFLATED) as zip_out:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    path = os.path.join(root, file)
                    arcname = os.path.relpath(path, temp_dir)
                    zip_out.write(path, arcname)

        output_stream.seek(0)
        return output_stream.read()  # Return raw bytes

    finally:
        shutil.rmtree(temp_dir)


# ✅ This is the function Cerebrium will call
def process_json(file_base64: str) -> dict:
    try:
        file_bytes = base64.b64decode(file_base64)
        input_stream = io.BytesIO(file_bytes)
        output_bytes = process_docx_zip_nfc(input_stream)

        encoded_output = base64.b64encode(output_bytes).decode('utf-8')
        return {"normalized_file_base64": encoded_output}

    except Exception as e:
        return {"error": str(e)}
