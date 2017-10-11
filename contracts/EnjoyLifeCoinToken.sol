pragma solidity ^0.4.15;

import './BurnableToken.sol';

contract EnjoyLifeCoinToken is BurnableToken {
  string public constant name = 'Enjoy Life';
  string public constant symbol = 'ENL';
  uint32 public constant decimals = 2;
  uint public constant initialSupply = 5E9; // 50 000 000

  function EnjoyLifeCoinToken() {
    totalSupply = initialSupply;
    balances[msg.sender] = initialSupply;
  }
}
