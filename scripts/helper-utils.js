const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * Helper Utilities for MYXN Metadata Management
 * Provides reusable functions for IPFS, hashing, validation, and more
 */

/**
 * Compute SHA256 hash of a file or buffer
 * @param {string|Buffer} pathOrBuffer - File path or buffer
 * @returns {string} Hex-encoded SHA256 hash
 */
function sha256File(pathOrBuffer) {
  const hash = crypto.createHash('sha256');
  
  if (Buffer.isBuffer(pathOrBuffer)) {
    hash.update(pathOrBuffer);
  } else if (typeof pathOrBuffer === 'string') {
    const content = fs.readFileSync(pathOrBuffer);
    hash.update(content);
  } else {
    throw new Error('Input must be a file path or Buffer');
  }
  
  return hash.digest('hex');
}

/**
 * Canonicalize JSON for deterministic hashing
 * Sorts keys recursively and formats consistently
 * @param {Object} obj - Object to canonicalize
 * @returns {string} Canonical JSON string
 */
function canonicalizeJson(obj) {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizeJson(obj[key]);
  });
  
  return '{' + pairs.join(',') + '}';
}

/**
 * Validate Solana base58 address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
function validateBase58(address) {
  if (!address || typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

/**
 * Validate IPFS CID
 * @param {string} cid - CID to validate
 * @returns {boolean} True if valid
 */
function validateCID(cid) {
  if (!cid || typeof cid !== 'string') return false;
  
  // CIDv0: starts with Qm, 46 characters
  if (cid.startsWith('Qm') && cid.length === 46) return true;
  
  // CIDv1: starts with bafy or baf, variable length
  if ((cid.startsWith('bafy') || cid.startsWith('baf')) && cid.length >= 50) return true;
  
  return false;
}

/**
 * Get ISO8601 timestamp
 * @returns {string} ISO timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Download content from IPFS gateway
 * @param {string} cid - IPFS CID
 * @param {string} gateway - Gateway URL (default: ipfs.io)
 * @returns {Promise<Buffer>} Downloaded content
 */
async function ipfsDownload(cid, gateway = 'https://ipfs.io/ipfs') {
  const url = `${gateway}/${cid}`;
  
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
      
    } catch (error) {
      lastError = error;
      console.warn(`⚠️  Download attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        console.log(`   Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }
  
  throw new Error(`Failed to download from IPFS after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Upload to Web3.Storage
 * @param {string} filePath - Path to file
 * @param {string} token - Web3.Storage API token
 * @returns {Promise<string>} IPFS CID
 */
async function uploadWeb3Storage(filePath, token) {
  const { Web3Storage, File } = require('web3.storage');
  
  const client = new Web3Storage({ token });
  const content = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  
  const file = new File([content], fileName, { type: 'application/json' });
  
  console.log(`📤 Uploading ${fileName} to Web3.Storage...`);
  const cid = await client.put([file], {
    wrapWithDirectory: false,
    name: fileName
  });
  
  console.log(`✅ Uploaded! CID: ${cid}`);
  return cid;
}

/**
 * Upload to Pinata
 * @param {string} filePath - Path to file
 * @param {string} jwt - Pinata JWT token
 * @returns {Promise<string>} IPFS CID
 */
async function uploadPinata(filePath, jwt) {
  const FormData = require('form-data');
  const form = new FormData();
  
  form.append('file', fs.createReadStream(filePath));
  
  const metadata = JSON.stringify({
    name: path.basename(filePath),
    keyvalues: {
      project: 'MYXN',
      type: 'metadata'
    }
  });
  form.append('pinataMetadata', metadata);
  
  const options = JSON.stringify({
    cidVersion: 1
  });
  form.append('pinataOptions', options);
  
  console.log(`📤 Uploading to Pinata...`);
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`
    },
    body: form
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }
  
  const result = await response.json();
  console.log(`✅ Uploaded! CID: ${result.IpfsHash}`);
  
  return result.IpfsHash;
}

/**
 * Ensure deploy-records directory exists
 */
function ensureDeployRecordsDir() {
  const dir = path.join(__dirname, '../deploy-records');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save deployment record
 * @param {string} filename - Record filename
 * @param {Object} data - Record data
 */
function saveDeployRecord(filename, data) {
  const dir = ensureDeployRecordsDir();
  const filePath = path.join(dir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`📝 Saved record: ${filePath}`);
  
  return filePath;
}

module.exports = {
  sha256File,
  canonicalizeJson,
  validateBase58,
  validateCID,
  getTimestamp,
  ipfsDownload,
  uploadWeb3Storage,
  uploadPinata,
  ensureDeployRecordsDir,
  saveDeployRecord
};
