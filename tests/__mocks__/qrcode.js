/**
 * Mock for QRCode
 */

const QRCode = {
  toDataURL: jest.fn().mockImplementation((data, options) => {
    return Promise.resolve(`data:image/png;base64,MOCK_QR_DATA_FOR_${data}`);
  }),
  toFile: jest.fn().mockImplementation((path, data, options) => {
    return Promise.resolve();
  }),
  toString: jest.fn().mockImplementation((data, options) => {
    return Promise.resolve(`MOCK_QR_STRING_FOR_${data}`);
  })
};

module.exports = QRCode;