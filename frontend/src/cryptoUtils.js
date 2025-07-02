export async function rsaEncryptAESKey(rawAESKey, publicKeyPem) {
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = publicKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDer = atob(pemContents);
  const binaryDerBuf = new Uint8Array(
    [...binaryDer].map((char) => char.charCodeAt(0))
  );

  const cryptoKey = await window.crypto.subtle.importKey(
    "spki",
    binaryDerBuf,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    rawAESKey
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}
