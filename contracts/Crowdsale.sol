pragma solidity ^0.4.15;

import "./Ownable.sol";
import "./SafeMath.sol";
import "./EnjoyLifeCoinToken.sol";

contract Crowdsale is Ownable {
  using SafeMath for uint;

  address feeAccount;         // 0xdA39e0Ce2adf93129D04F53176c7Bfaaae8B051a
  address bountyAccount;      // 0x0064952457905eBFB9c0292200A74B1d7414F081
  address projectTeamAccount; // 0x980F0A3fEDc9D5236C787A827ab7c2276227D78d
  address otherAccount;       // 0x3433974240b95bafc8705074c0859cee92a562f8

  uint startPreICO; // 01.11.2017 12:00 UTC+2 --> 1509530400
  uint startICO;    // 01.12.2017 12:00 UTC+2 --> 1512122400
  uint endICO;      // 15.01.2018 00:00 UTC+2 --> 1515967200

  uint rate = 50;                   // 0.5 USD
  uint minInvestmentPreICO = 20000; // 200 USD
  uint minInvestmentICO = 5000;     // 50 USD

  uint minCapICO = 160000000;    // 1 600 000 tokens
  uint maxCapPreICO = 100000000; // 1 000 000 tokens

  EnjoyLifeCoinToken public token = new EnjoyLifeCoinToken();

  function Crowdsale(uint _startPreICO, uint _startICO, uint _endICO) {
    startPreICO = _startPreICO;
    startICO = _startICO;
    endICO = _endICO;
  }
}
