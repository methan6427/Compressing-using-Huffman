import React, { useState ,useEffect } from 'react';
import { FileText, Upload, Download, BarChart2, List } from 'lucide-react';
import './App.css';

// Utility function to convert unsigned byte to integer
const unsignedToBytes = (a) => {
  return a & 0xFF;
};

// Huffman node class
class HeapEntry {
  constructor(ascii = 0, repetition = 0) {
    this.ascii = ascii;
    this.repetition = repetition;
    this.left = null;
    this.right = null;
  }

  isLeaf() {
    return this.left === null && this.right === null;
  }

  compareTo(other) {
    return this.repetition - other.repetition;
  }
}

// Huffman code class for table
class Huffman {
  constructor(ascii = 0, huffman = "", repetition = 0, length = 0) {
    this.ascii = ascii;
    this.huffman = huffman;
    this.repetition = repetition;
    this.length = length;
  }
}

// MinHeap implementation
class MinHeap {
  constructor(size) {
    this.tableSize = size + 1;
    this.currentSize = 0;
    this.heapTable = new Array(this.tableSize).fill(null);
  }

  add(newEntry) {
    if (this.tableSize - this.currentSize === 1) {
      console.log("Heap is full");
      return false;
    }
    this.currentSize++;
    this.heapTable[this.currentSize] = newEntry;
    this.swim(this.currentSize);
    return true;
  }

  removeMin() {
    if (!this.isEmpty()) {
      const min = this.heapTable[1];
      this.exchange(1, this.currentSize);
      this.currentSize--;
      this.sink(1);
      this.heapTable[this.currentSize + 1] = null;
      return min;
    }
    return null;
  }

  getMin() {
    if (!this.isEmpty()) {
      return this.heapTable[1];
    }
    return null;
  }

  isEmpty() {
    return this.currentSize === 0;
  }

  getSize() {
    return this.currentSize;
  }

  clear() {
    this.currentSize = 0;
  }

  swim(k) {
    while (k > 1 && !this.firstArgIsLess(Math.floor(k / 2), k)) {
      this.exchange(Math.floor(k / 2), k);
      k = Math.floor(k / 2);
    }
  }

  sink(k) {
    while (2 * k <= this.currentSize) {
      let j = 2 * k;
      if (j < this.currentSize && !this.firstArgIsLess(j, j + 1)) {
        j++;
      }
      if (this.firstArgIsLess(k, j)) {
        break;
      }
      this.exchange(k, j);
      k = j;
    }
  }

  firstArgIsLess(k1, k2) {
    return this.heapTable[k1].compareTo(this.heapTable[k2]) < 0;
  }

  exchange(k1, k2) {
    const temp = this.heapTable[k1];
    this.heapTable[k1] = this.heapTable[k2];
    this.heapTable[k2] = temp;
  }
}

// Table component to display huffman codes
const HuffmanTable = ({ table }) => {
  const filteredTable = table.filter(entry => entry !== null && entry.repetition > 0);

  return (
      <div className="table-container">
        <table>
          <thead>
          <tr>
            <th>ASCII (Char)</th>
            <th>Huffman Code</th>
            <th>Repetition</th>
            <th>Code Length</th>
          </tr>
          </thead>
          <tbody>
          {filteredTable.map((entry, index) => (
              <tr key={index}>
                <td>{entry.ascii} ({String.fromCharCode(entry.ascii)})</td>
                <td className="code">{entry.huffman}</td>
                <td className="text-right">{entry.repetition}</td>
                <td className="text-right">{entry.length}</td>
              </tr>
          ))}
          </tbody>
        </table>
      </div>
  );
};

// Header info modal
const HeaderInfoModal = ({ headerList, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2 className="modal-title">Header Information</h2>
          <div className="modal-body">
            {headerList.length > 0 && (
                <div>
                  <p>Header size: {headerList.length} bytes</p>
                  <ul className="header-list">
                    {headerList.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
            )}
          </div>
          <div className="modal-footer">
            <button
                onClick={onClose}
                className="modal-button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
  );
};

// Format file size
/*const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} bytes`;
  else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  else return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
*/
const formatFileSize = (bytes) => {
  const formattedBytes = bytes.toLocaleString(); // Add commas for readability

  if (bytes < 1024) {
    return `${formattedBytes} bytes`;
  } else if (bytes < 1024 * 1024) {
    const kb = Math.floor(bytes / 1024);
    return `${formattedBytes} bytes (${kb} KB)`;
  } else {
    const mb = Math.floor(bytes / (1024 * 1024));
    return `${formattedBytes} bytes (${mb} MB)`;
  }
};
// Main component
const App = () => {
  const [file, setFile] = useState(null);
  const [fileSize, setFileSize] = useState(0);
  const [outputMessage, setOutputMessage] = useState("");
  const [huffmanTable, setHuffmanTable] = useState([]);
  const [compressionStats, setCompressionStats] = useState("");
  const [headerList, setHeaderList] = useState([]);
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDecompressing, setIsDecompressing] = useState(false);
  useEffect(() => {
    document.title = "Huffman Compresser";
  }, []);
  // Create Huffman tree and codes
  const createHuffmanTree = async (fileData) => {
    const frequencyArray = new Array(256).fill(0);
    for (let i = 0; i < fileData.length; i++) {
      const byteValue = unsignedToBytes(fileData[i]);
      frequencyArray[byteValue]++;
    }

    const heap = new MinHeap(257);
    let size = 0;

    for (let i = 0; i < frequencyArray.length; i++) {
      if (frequencyArray[i] !== 0) {
        heap.add(new HeapEntry(i, frequencyArray[i]));
        size++;
      }
    }

    for (let i = 1; i < size; i++) {
      const z = new HeapEntry();
      const a = heap.removeMin();
      const b = heap.removeMin();

      z.left = a;
      z.right = b;
      z.repetition = a.repetition + b.repetition;

      heap.add(z);
    }

    const root = heap.getMin();
    const table = new Array(256).fill(null);

    const traversal = (node, code, huffmanTable) => {
      if (!node) return;

      if (!node.isLeaf()) {
        traversal(node.left, code + '0', huffmanTable);
        traversal(node.right, code + '1', huffmanTable);
      } else {
        huffmanTable[node.ascii] = new Huffman(
            node.ascii,
            code,
            node.repetition,
            code.length
        );
      }
    };

    traversal(root, "", table);
    return { table, root };
  };

  // Compress file
  const compressFile = async (fileData, huffmanTable, root) => {
    const listBinary = [];
    const finalList = [];

    const createHeader = (node) => {
      if (!node) return;

      if (node.isLeaf()) {
        listBinary.push(1);
        finalList.push(node.ascii);
        return;
      }

      listBinary.push(0);
      createHeader(node.left);
      createHeader(node.right);
    };

    createHeader(root);

    const headerList = [];
    const fileName = file.name;
    const fileExt = fileName.substring(fileName.lastIndexOf('.'));

    headerList.push(fileExt.length);
    for (let i = 0; i < fileExt.length; i++) {
      headerList.push(fileExt.charCodeAt(i));
    }

    let treeBits = listBinary.join('');
    while (treeBits.length % 8 !== 0) {
      treeBits += '0';
    }

    const treeByteCount = treeBits.length / 8;
    headerList.push(treeByteCount >> 8, treeByteCount & 0xFF);

    for (let i = 0; i < treeBits.length; i += 8) {
      const byte = treeBits.substr(i, 8);
      headerList.push(parseInt(byte, 2));
    }

    headerList.push(finalList.length >> 8, finalList.length & 0xFF);
    headerList.push(...finalList);

    let compressedBits = '';
    for (let i = 0; i < fileData.length; i++) {
      const value = unsignedToBytes(fileData[i]);
      compressedBits += huffmanTable[value].huffman;
    }

    const paddingBits = (8 - (compressedBits.length % 8)) % 8;
    compressedBits += '0'.repeat(paddingBits);

    const compressedBytes = [];
    for (let i = 0; i < compressedBits.length; i += 8) {
      const byte = compressedBits.substr(i, 8);
      compressedBytes.push(parseInt(byte, 2));
    }

    compressedBytes.push(paddingBits);

    const finalData = new Uint8Array([...headerList, ...compressedBytes]);

    const originalSize = fileData.length;
    const compressedSize = finalData.length;
    const ratio = (compressedSize / originalSize) * 100;

    const stats = [
      `Original Size: ${formatFileSize(originalSize)}`,
      `Compressed Size: ${formatFileSize(compressedSize)}`,
      `Compression Ratio: ${ratio.toFixed(2)}% of original size`,
      ratio < 100 ? `Space Saved: ${(100 - ratio).toFixed(2)}%` : 'No space saved'
    ].join('\n');

    setCompressionStats(stats);
    setHeaderList(headerList);

    return {
      compressedData: finalData,
      headerList,
      stats
    };
  };

  // Handle file decompression
  const decompressFile = async (fileData) => {
    let position = 0;

    const extLength = fileData[position++];
    let extension = '';
    for (let i = 0; i < extLength; i++) {
      extension += String.fromCharCode(fileData[position++]);
    }

    const treeByteCount = (fileData[position++] << 8) | fileData[position++];
    let treeBits = '';
    for (let i = 0; i < treeByteCount; i++) {
      let byte = fileData[position++].toString(2);
      while (byte.length < 8) byte = '0' + byte;
      treeBits += byte;
    }

    const leafCount = (fileData[position++] << 8) | fileData[position++];
    const leafValues = [];
    for (let i = 0; i < leafCount; i++) {
      leafValues.push(fileData[position++]);
    }

    let leafIndex = 0;
    const buildTree = () => {
      if (treeBits[0] === '1') {
        treeBits = treeBits.substring(1);
        return new HeapEntry(leafValues[leafIndex++], 0);
      } else {
        treeBits = treeBits.substring(1);
        const node = new HeapEntry(0, 0);
        node.left = buildTree();
        node.right = buildTree();
        return node;
      }
    };

    const root = buildTree();

    const decompressedData = [];
    let currentBits = '';

    for (let i = position; i < fileData.length - 1; i++) {
      let binary = fileData[i].toString(2);
      while (binary.length < 8) {
        binary = '0' + binary;
      }
      currentBits += binary;

      while (currentBits.length >= 8) {
        let node = root;
        let bitsUsed = 0;

        while (!node.isLeaf() && bitsUsed < currentBits.length) {
          if (currentBits[bitsUsed] === '0') {
            node = node.left;
          } else {
            node = node.right;
          }
          bitsUsed++;
        }

        if (node.isLeaf()) {
          decompressedData.push(node.ascii);
          currentBits = currentBits.substring(bitsUsed);
        } else {
          break;
        }
      }
    }

    if (fileData.length > position) {
      const lastByte = fileData[fileData.length - 2];
      const lastLength = fileData[fileData.length - 1];

      let binary = lastByte.toString(2);
      while (binary.length < lastLength) {
        binary = '0' + binary;
      }

      currentBits += binary;

      while (currentBits.length > 0) {
        let node = root;
        let bitsUsed = 0;

        while (!node.isLeaf() && bitsUsed < currentBits.length) {
          if (currentBits[bitsUsed] === '0') {
            node = node.left;
          } else {
            node = node.right;
          }
          bitsUsed++;
        }

        if (node.isLeaf()) {
          decompressedData.push(node.ascii);
          currentBits = currentBits.substring(bitsUsed);
        } else {
          break;
        }
      }
    }

    return {
      decompressedData: new Uint8Array(decompressedData),
      extension
    };
  };

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileSize(selectedFile.size);
      setOutputMessage(`Selected file: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`);
      setHuffmanTable([]);
      setCompressionStats("");
    }
  };

  // Compress the selected file
  const handleCompression = async () => {
    if (!file) {
      setOutputMessage("Please select a file first");
      return;
    }

    setOutputMessage(`Compressing file (${formatFileSize(file.size)})...`);
    setIsCompressing(true);

    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      const { table, root } = await createHuffmanTree(fileData);
      setHuffmanTable(table);

      const { compressedData, stats } = await compressFile(fileData, table, root);

      const fileName = file.name.substring(0, file.name.lastIndexOf('.'));
      const blob = new Blob([compressedData], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.huf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setOutputMessage(`Compression complete! File saved as ${fileName}.huf (${formatFileSize(compressedData.length)})`);
      setCompressionStats(stats);
    } catch (error) {
      console.error("Compression error:", error);
      setOutputMessage(`Error during compression: ${error.message}`);
    } finally {
      setIsCompressing(false);
    }
  };

  // Decompress the selected file
  const handleDecompression = async () => {
    if (!file) {
      setOutputMessage("Please select a file first");
      return;
    }

    if (!file.name.endsWith('.huf')) {
      setOutputMessage("Please select a .huf file for decompression");
      return;
    }

    setOutputMessage(`Decompressing file (${formatFileSize(file.size)})...`);
    setIsDecompressing(true);

    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      const { decompressedData, extension } = await decompressFile(fileData);

      const fileName = file.name.substring(0, file.name.lastIndexOf('.'));
      const blob = new Blob([decompressedData], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_decompressed.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setOutputMessage(`Decompression complete! File saved as ${fileName}_decompressed.${extension} (${formatFileSize(decompressedData.length)})`);
    } catch (error) {
      console.error("Decompression error:", error);
      setOutputMessage(`Error during decompression: ${error.message}`);
    } finally {
      setIsDecompressing(false);
    }
  };

  return (
      <div className="app-container">
        <div className="app">
          <header className="app-header">
            <h1 className="title">Huffman File Compression</h1>
            <p className="subtitle">Compress and decompress files using Huffman coding algorithm</p>
          </header>

          <div className="file-processor">
            <div className="input-group">
              <label className="input-label">Select File</label>
              <input
                  type="file"
                  onChange={handleFileChange}
                  className="file-input"
              />
              {file && (
                  <div className="file-info">
                    Selected: {file.name} ({formatFileSize(fileSize)})
                  </div>
              )}
            </div>

            <div className="button-group">
              <div className="button-wrapper">
                <button
                    onClick={handleCompression}
                    disabled={!file || isCompressing}
                    className="action-button compress-button"
                >
                  {isCompressing ? (
                      <span>Compressing...</span>
                  ) : (
                      <>
                        <Upload size={18} className="button-icon" />
                        <span>Compress File</span>
                      </>
                  )}
                </button>
              </div>

              <div className="button-wrapper">
                <button
                    onClick={handleDecompression}
                    disabled={!file || isDecompressing || !file?.name?.endsWith('.huf')}
                    className="action-button decompress-button"
                >
                  {isDecompressing ? (
                      <span>Decompressing...</span>
                  ) : (
                      <>
                        <Download size={18} className="button-icon" />
                        <span>Decompress File</span>
                      </>
                  )}
                </button>
              </div>
            </div>

            {outputMessage && (
                <div className="message-box">
                  <p>{outputMessage}</p>
                </div>
            )}
          </div>

          {compressionStats && (
              <div className="compression-results">
                <div className="stats-header">
                  <h2 className="stats-title">
                    <BarChart2 size={20} className="stats-icon" />
                    Compression Statistics
                  </h2>

                  <button
                      onClick={() => setShowHeaderModal(true)}
                      className="view-header-button"
                  >
                    <List size={16} className="button-icon" />
                    View Header Info
                  </button>
                </div>

                <div className="stats">
                  <pre>{compressionStats}</pre>
                </div>
              </div>
          )}

          {huffmanTable.filter(entry => entry !== null).length > 0 && (
              <div className="huffman-table-container">
                <h2 className="section-title">
                  <FileText size={20} className="section-icon" />
                  Huffman Encoding Table
                </h2>
                <HuffmanTable table={huffmanTable} />
              </div>
          )}
        </div>

        <HeaderInfoModal
            headerList={headerList}
            isOpen={showHeaderModal}
            onClose={() => setShowHeaderModal(false)}
        />
      </div>
  );
};

export default App;