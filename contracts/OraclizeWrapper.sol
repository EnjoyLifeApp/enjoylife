pragma solidity ^0.4.15;

import './oraclizeAPI_0.4.sol';

contract OraclizeWrapper is usingOraclize {

  string public responceOraclize;

  event newRateUSD(string rateUSD);

  function s2b(string s) constant returns (bytes32) {
    bytes memory b = bytes(s);
    uint r = 0;
    for (uint i = 0; i < 32; i++) {
      if (i < b.length) {
        r = r | uint(b[i]);
      }
      if (i < 31) r = r * 256;
    }
    return bytes32(r);
  }

  function update() payable {
    oraclize_query(21600, 'WolframAlpha', 'eth to cent'); // every 6 hours
  }

  function __callback(bytes32 myid, string result) {
    if (msg.sender != oraclize_cbAddress()) revert();
    responceOraclize = result;
    newRateUSD(result);
  }

  function getRate() public constant returns(bytes32) {
    return s2b(responceOraclize);
  }

  function() payable {}
}
