const fs = require("fs");
const XLSX = require("xlsx");
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Universal Utility Library
 * A comprehensive collection of utility functions for file operations, 
 * HTTP requests, data processing, and more.
 * 
 * @version 1.0.0
 * @author Your Name
 */

//#region File Operations
/**
 * Get all files and folders in a directory
 * @param {string} directoryPath - Path to the directory
 * @returns {Promise<string[]|null>} Array of file/folder names or null if error
 */
const getChildFileOrFolder = (directoryPath) => {
    return new Promise((resolve, reject) => {
        fs.readdir(directoryPath, (err, result) => {
            if (err) {
                console.log('Unable to scan directory: ' + err);
                resolve(null);
            }
            resolve(result);
        });
    });
};

/**
 * Find the latest version of a file with version numbering
 * @param {string} directoryPath - Directory to search in
 * @param {string} fileName - Base filename to look for
 * @param {string} separator - Separator between filename and version number
 * @returns {Promise<Object>} Object with filename, version, and recommended next name
 */
const getLatestVersion = (directoryPath, fileName, separator = "") => {
    return new Promise((resolve, reject) => {
        const path = require("path");
        const fileNameExtension = path.extname(fileName);
        const fileNameWithoutExtension = path.basename(fileName, fileNameExtension);
        const files = fs.readdirSync(directoryPath);
        const mappingFiles = files.filter(f => 
            f.startsWith(fileNameWithoutExtension) && f.endsWith(fileNameExtension)
        );

        if (!mappingFiles.length) {
            resolve({
                filename: "",
                version: 0,
                recommendedNextName: `${fileNameWithoutExtension}${separator}0${fileNameExtension}`
            });
            return;
        }

        const getVersion = (inputFileName) => {
            const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedExtension = fileNameExtension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedFileName = fileNameWithoutExtension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            let regexPattern;
            if (separator) {
                regexPattern = `^${escapedFileName}${escapedSeparator}(\\d+)${escapedExtension}$`;
            } else {
                regexPattern = `^${escapedFileName}.*?(\\d+)${escapedExtension}$`;
            }

            const regex = new RegExp(regexPattern);
            const match = inputFileName.match(regex);

            if (match && match[1]) {
                return parseInt(match[1]);
            } else if (inputFileName === `${fileNameWithoutExtension}${fileNameExtension}`) {
                return 0;
            }
            return 0;
        };

        const latest = mappingFiles.reduce((a, b) => getVersion(a) > getVersion(b) ? a : b);
        const latestVersion = getVersion(latest);
        const nextVersion = latestVersion + 1;

        const recommendedNextName = separator 
            ? `${fileNameWithoutExtension}${separator}${nextVersion}${fileNameExtension}`
            : `${fileNameWithoutExtension}${nextVersion}${fileNameExtension}`;

        resolve({
            filename: latest,
            version: latestVersion,
            recommendedNextName,
            nextVersion
        });
    });
};

/**
 * Read and parse Excel file to JSON
 * @param {string} filePath - Path to Excel file
 * @param {number} sheetIndex - Sheet index (default: 0)
 * @returns {Promise<Object[]>} Parsed Excel data as JSON array
 */
const readExcelFile = async (filePath, sheetIndex = 0) => {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[sheetIndex]]);
};

/**
 * Read JSON file asynchronously
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>} Parsed JSON object
 */
const readJsonFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) reject(err);
            try {
                resolve(JSON.parse(data));
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    });
};

/**
 * Write data to Excel file
 * @param {Object[]} data - Array of objects to write
 * @param {string} filePath - Output file path
 * @param {string} sheetName - Sheet name (default: "Sheet1")
 */
const writeToExcelFile = (data, filePath, sheetName = "Sheet1") => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filePath);
    console.log(`Excel file ${filePath} has been saved.`);
};

/**
 * Write data to JSON file
 * @param {Object} data - Data to write
 * @param {string} filePath - Output file path
 * @param {boolean} prettify - Whether to format JSON (default: true)
 * @returns {Promise<void>}
 */
const writeToJsonFile = (data, filePath, prettify = true) => {
    return new Promise((resolve, reject) => {
        const jsonString = prettify ? JSON.stringify(data, null, 2) : JSON.stringify(data);
        fs.writeFile(filePath, jsonString, "utf8", (err) => {
            if (err) {
                console.log("Error writing JSON file:", err);
                reject(err);
            } else {
                console.log(`JSON file ${filePath} has been saved.`);
                resolve();
            }
        });
    });
};

/**
 * Write text to file
 * @param {string} data - Text data to write
 * @param {string} filePath - Output file path
 * @returns {Promise<void>}
 */
const writeToTextFile = (data, filePath) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, (err) => {
            if (err) {
                console.log("Error writing text file:", err);
                reject(err);
            } else {
                console.log(`Text file ${filePath} has been saved.`);
                resolve();
            }
        });
    });
};
//#endregion

//#region HTTP Operations
/**
 * Perform HTTP GET request using built-in modules
 * @param {string} urlString - URL to request
 * @param {Object} options - Additional request options
 * @returns {Promise<string>} Response data
 */
const httpGet = (urlString, options = {}) => {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlString);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const requestOptions = {
            method: 'GET',
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            timeout: 10000,
            ...options,
        };

        const req = protocol.request(requestOptions, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }

            let rawData = '';
            res.setEncoding('utf8');
            
            res.on('data', (chunk) => rawData += chunk);
            res.on('end', () => resolve(rawData));
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        req.setTimeout(requestOptions.timeout);
        req.end();
    });
};

/**
 * Perform HTTP POST request
 * @param {string} url - URL to post to
 * @param {string|Object} postData - Data to send
 * @param {Object} options - Additional request options
 * @returns {Promise<Object>} Response object with statusCode, headers, and data
 */
const httpPost = (url, postData, options = {}) => {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        const data = typeof postData === 'object' ? JSON.stringify(postData) : postData;

        const defaultOptions = {
            method: 'POST',
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data, 'utf8')
            },
            timeout: 10000
        };

        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...(options.headers || {}) }
        };

        const req = protocol.request(requestOptions, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({ statusCode: res.statusCode, headers: res.headers, data: jsonData });
                } catch (error) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, data: responseData });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        req.setTimeout(requestOptions.timeout);
        if (data) req.write(data);
        req.end();
    });
};
//#endregion

//#region String Operations
/**
 * Find the position of a substring at a specific occurrence
 * @param {string} string - Main string
 * @param {string} subStr - Substring to find
 * @param {number} index - Which occurrence (1-based)
 * @returns {number|null} Position of substring or null if not found
 */
const getPositionOfSubString = (string, subStr, index) => {
    if (!string.includes(subStr)) return null;

    const parts = string.split(subStr);
    if (parts.length < index) return null;

    let position = 0;
    for (let i = 0; i < index; i++) {
        position += parts[i].length;
    }
    return position + (index - 1) * subStr.length;
};

/**
 * insert character to string at index
 * @param {*} originalString 
 * @param {*} charToInsert 
 * @param {*} position 
 * @returns 
 */
const insertChar = function(originalString, charToInsert, position) {
    // Handle cases where position is out of bounds
    if (position < 0) {
      position = 0;
    }
    if (position > originalString.length) {
      position = originalString.length;
    }
  
    // Slice the string and concatenate
    return originalString.slice(0, position) + charToInsert + originalString.slice(position);
  }

/**
 * Remove Vietnamese accent marks from text
 * @param {string} str - String with Vietnamese characters
 * @returns {string} String without accents
 */
const removeVietnameseTones = (str) => {
    return str
        .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
        .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
        .replace(/ì|í|ị|ỉ|ĩ/g, "i")
        .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
        .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
        .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
        .replace(/đ/g, "d")
        .replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A")
        .replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E")
        .replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I")
        .replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O")
        .replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U")
        .replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y")
        .replace(/Đ/g, "D")
        .replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "") // Combining accents
        .replace(/\u02C6|\u0306|\u031B/g, "") // Circumflex, breve, horn
        .replace(/ + /g, " ") // Multiple spaces
        .replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g, " ")
        .trim();
};
//#endregion

//#region Array Operations
/**
 * Merge two arrays and get distinct values (optimized version)
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @param {boolean} assumeUnique - Whether values in each array are already unique
 * @returns {Promise<Array>} Merged array with distinct values
 */
const mergeAndGetDistinctValues = async (arr1, arr2, assumeUnique = true) => {
    if (assumeUnique) {
        const newItems = arr2.filter(x => !arr1.includes(x));
        return arr1.concat(newItems);
    } else {
        const combined = arr1.concat(arr2);
        return [...new Set(combined)];
    }
};

/**
 * Remove duplicates from array based on a property (optimized for objects with MaEMS)
 * @param {Array} arr - Array to deduplicate
 * @param {string} keyField - Field to use for uniqueness (default: 'MaEMS')
 * @returns {Promise<Array>} Array with unique items
 */
const getUniqueItems = async (arr, keyField = 'MaEMS') => {
    const seen = new Set();
    const result = [];

    for (const item of arr) {
        const key = item[keyField];
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }

    return result;
};

/**
 * Group array items by a key and return as 2D array
 * @param {Array} arr - Array to group
 * @param {string} key - Property to group by
 * @returns {Array[]} Array of grouped arrays
 */
const groupBy2DArray = (arr, key) => {
    const groups = arr.reduce((acc, item) => {
        const groupKey = item[key];
        acc[groupKey] = acc[groupKey] || [];
        acc[groupKey].push(item);
        return acc;
    }, {});
    
    return Object.values(groups);
};

/**
 * Group array items by a key and return as object
 * @param {Array} arr - Array to group
 * @param {string} key - Property to group by
 * @returns {Object} Object with grouped arrays
 */
const groupBy = (arr, key) => {
    return arr.reduce((acc, item) => {
        const groupKey = item[key];
        acc[groupKey] = acc[groupKey] || [];
        acc[groupKey].push(item);
        return acc;
    }, {});
};
//#endregion

//#region Console Operations
/**
 * Create colored console notifications
 * @param {string} content - Content to display
 * @returns {Object} Object with success, warning, and error methods
 */
const notify = (content) => {
    const ending = "%s\x1b[0m";
    return {
        success: () => console.log('\x1b[32m' + ending, content),
        warning: () => console.log('\x1b[33m' + ending, content),
        error: () => console.log('\x1b[31m' + ending, content),
        info: () => console.log('\x1b[36m' + ending, content),
        log: () => console.log(content)
    };
};
//#endregion

//#region Timer Operations
/**
 * Sleep/delay execution for specified time
 * @param {number} time - Time to sleep in milliseconds (default: 100)
 * @returns {Promise<void>} Promise that resolves after the delay
 */
const sleep = (time = 100) => {
    return new Promise(resolve => setTimeout(resolve, time));
};

/**
 * Create a timeout promise that rejects after specified time
 * @param {number} ms - Milliseconds to wait before timing out
 * @returns {Promise<never>} Promise that rejects with timeout error
 */
const timeout = (ms) => {
    return new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), ms)
    );
};

/**
 * Race a promise against a timeout
 * @param {Promise} promise - Promise to race
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} The promise or timeout, whichever resolves/rejects first
 */
const withTimeout = (promise, ms) => {
    return Promise.race([promise, timeout(ms)]);
};
//#endregion

//#region Utility Functions
/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
const isEmpty = (value) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Deep cloned object
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map(deepClone);
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
};

/**
 * Generate a simple UUID v4
 * @returns {string} UUID string
 */
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
//#endregion

// Export all functions
module.exports = {
    // File Operations
    getChildFileOrFolder,
    getLatestVersion,
    readExcelFile,
    readJsonFile,
    writeToExcelFile,
    writeToJsonFile,
    writeToTextFile,

    // HTTP Operations
    httpGet,
    httpPost,
    
    // Legacy aliases for backward compatibility
    httpGetBuiltIn: httpGet,
    createPostRequest: httpPost,

    // String Operations
    getPositionOfSubString,
    insertChar,
    removeVietnameseTones,

    // Array Operations
    mergeAndGetDistinctValues,
    mergeAndGetDistinctValuesFrom2Arrays: mergeAndGetDistinctValues, // Legacy alias
    getUniqueItems,
    uniq_fast: getUniqueItems, // Legacy alias
    groupBy2DArray,
    groupBy,

    // Console Operations
    notify,

    // Timer Operations
    sleep,
    timeout,
    withTimeout,

    // Utility Functions
    isEmpty,
    deepClone,
    generateUUID
};