import os
import io
import unicodedata
import zipfile
import tempfile
import shutil
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS # For handling cross-origin requests from React dev server
from werkzeug.utils import secure_filename

# --- Configuration ---
ALLOWED_EXTENSIONS = {'docx'}

app = Flask(__name__)
# Increase max content length if needed, e.g., 32MB
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024
CORS(app) # Allow requests from your React app's origin (adjust for production)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_docx_zip_nfc(input_stream):
    """
    Reads a docx file stream, normalizes text content within its
    internal word/document.xml to NFC by treating the docx as a zip file,
    and returns a new docx file stream. Preserves formatting better.
    """
    temp_dir = None # Initialize outside try block for use in finally
    try:
        # Create a secure temporary directory
        temp_dir = tempfile.mkdtemp()

        # 1. Unzip the input docx stream into the temporary directory
        try:
            with zipfile.ZipFile(input_stream, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
        except zipfile.BadZipFile:
            raise ValueError("Invalid or corrupted DOCX file.")
        except Exception as e:
             raise ValueError(f"Failed to extract DOCX file: {e}")


        # 2. Find, read, normalize, and overwrite the main document XML
        document_path = os.path.join(temp_dir, 'word', 'document.xml')
        normalized = False
        if os.path.exists(document_path):
            try:
                with open(document_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Normalize the entire XML content string to NFC
                normalized_content = unicodedata.normalize('NFC', content)

                # Check if normalization actually changed anything (optional optimization)
                if content != normalized_content:
                    with open(document_path, 'w', encoding='utf-8') as f:
                        f.write(normalized_content)
                    normalized = True
                else:
                    # If no change, we could potentially return the original stream,
                    # but re-zipping ensures consistency. Let's proceed with re-zipping.
                    normalized = True # Still treat as 'processed'

            except Exception as e:
                # Log error details
                app.logger.error(f"Error reading/writing document.xml: {e}")
                raise ValueError(f"Error processing the content of the DOCX: {e}")
        else:
            # It's possible the main content isn't in document.xml (unlikely for typical docs)
            # Or maybe it's not a valid docx structure after unzipping.
            raise ValueError("Could not find 'word/document.xml' within the DOCX file.")

        # 3. Re-zip the contents of the temporary directory into an in-memory stream
        output_stream = io.BytesIO()
        with zipfile.ZipFile(output_stream, 'w', compression=zipfile.ZIP_DEFLATED) as zip_out:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Create the correct path inside the zip file
                    archive_name = os.path.relpath(file_path, temp_dir)
                    zip_out.write(file_path, archive_name)

        output_stream.seek(0) # Rewind the stream to the beginning for send_file
        return output_stream

    except Exception as e:
        # Log the exception for debugging
        app.logger.error(f"Error in process_docx_zip_nfc: {e}")
        # Re-raise specific types if needed, or a general error
        # The original ValueError types will propagate up if raised inside the try block
        if isinstance(e, ValueError):
             raise e
        else:
            raise RuntimeError(f"An unexpected error occurred during DOCX processing: {e}")

    finally:
        # 4. Clean up the temporary directory ALWAYS
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                # Log cleanup failure, but don't let it mask the original error
                app.logger.error(f"Failed to remove temporary directory {temp_dir}: {e}")


@app.route('/process', methods=['POST'])
def process_file_route():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        # Use secure_filename for safety, although we process from stream
        filename = secure_filename(file.filename)
        original_filename_base = os.path.splitext(filename)[0]
        output_filename = f"{original_filename_base}_normalized.docx"

        try:
            # Process the file using the zip/XML manipulation method
            processed_stream = process_docx_zip_nfc(file.stream)

            return send_file(
                processed_stream,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                as_attachment=True,
                download_name=output_filename # Use Flask >= 2.0
                # For older Flask: attachment_filename=output_filename
            )

        except (ValueError, zipfile.BadZipFile) as e:
             # Handle errors related to file processing/format
             app.logger.warning(f"Processing error for {filename}: {e}")
             return jsonify({"error": str(e)}), 400 # Bad Request or Unprocessable Entity (422) might fit
        except Exception as e:
            # Catch other potential errors (like runtime errors in processing func)
            app.logger.error(f"Unexpected error processing {filename}: {e}", exc_info=True) # Log stack trace
            return jsonify({"error": "An unexpected server error occurred during processing"}), 500

    else:
        return jsonify({"error": "Invalid file type. Only .docx is allowed."}), 400

if __name__ == '__main__':
    # Add basic logging
    import logging
    logging.basicConfig(level=logging.INFO)
    # Make Flask use standard logging
    app.logger.addHandler(logging.StreamHandler())
    app.logger.setLevel(logging.INFO)

    app.run(host='0.0.0.0', port=5001, debug=True) # Use a port like 5001. Turn debug=False for production!