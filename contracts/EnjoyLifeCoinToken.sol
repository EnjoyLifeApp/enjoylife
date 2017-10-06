pragma solidity ^0.4.15;

import './BurnableToken.sol';

contract EnjoyLifeCoinToken is BurnableToken {
  string public constant name = 'Enjoy Life';
  string public constant symbol = 'ENL';
  uint32 public constant decimals = 2;

  uint256 public INITIAL_SUPPLY = 5000000000;

  function EnjoyLifeCoinToken() {
    totalSupply = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
}
