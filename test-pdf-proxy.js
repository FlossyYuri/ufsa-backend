import axios from 'axios';
import fs from 'fs';

// Test the PDF proxy endpoint for both document types
async function testPdfProxy() {
  try {
    console.log('Testing PDF proxy endpoint for both document types...');

    // Test cases with different reference numbers and types
    const testCases = [
      {
        referencia: 'CR04J080441CC00032025',
        type: 'document',
        description: 'Tender Document (Terms and References)'
      },
      {
        referencia: '03/04I130241/SDSMASV%202025',
        type: 'announcement',
        description: 'Tender Announcement'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\nTesting ${testCase.description}...`);
      console.log(`Reference: ${testCase.referencia}`);
      console.log(`Type: ${testCase.type}`);

      try {
        // Make a request to the proxy endpoint
        const response = await axios.get(
          `http://localhost:3000/api/proxy-pdf?referencia=${testCase.referencia}&type=${testCase.type}`,
          { responseType: 'arraybuffer' }
        );

        console.log('Response status:', response.status);
        console.log('Content-Type:', response.headers['content-type']);
        console.log('Content-Length:', response.headers['content-length']);

        // Save the PDF to a file for verification
        const filename = `${testCase.type}-${testCase.referencia.replace(/[\/\s%]/g, '_')}.pdf`;
        fs.writeFileSync(filename, response.data);
        console.log(`PDF saved to ${filename}`);

        console.log(`${testCase.description} test completed successfully!`);
      } catch (error) {
        console.error(`Error testing ${testCase.description}:`, error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          if (error.response.data) {
            try {
              // Try to parse as JSON if possible
              const errorData = Buffer.from(error.response.data).toString();
              console.error('Response data:', errorData);
            } catch (e) {
              console.error('Could not parse error response data');
            }
          }
        }
      }
    }

    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error in test runner:', error.message);
  }
}

// Run the test
testPdfProxy();
