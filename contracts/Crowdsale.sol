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

  mapping(address => uint) public balancesPreICO;
  mapping(address => uint) public balancesICO;

  uint public startPreICO; // 01.11.2017 12:00 UTC+2 --> 1509530400
  uint public startICO;    // 01.12.2017 12:00 UTC+2 --> 1512122400
  uint public endICO;      // 15.01.2018 00:00 UTC+2 --> 1515967200

  uint public rate = 50;                   // 0.5 USD
  uint public minInvestmentPreICO = 20000; // 200 USD
  uint public minInvestmentICO = 5000;     // 50 USD
  uint public currentRateUSD = 30000;      // 300 USD = 1 ether

  uint minCapICO = 160000000;    // 1 600 000 tokens
  uint maxCapPreICO = 100000000; // 1 000 000 tokens

  uint public tokensCountPreICO;
  uint public tokensCountICO;

  EnjoyLifeCoinToken public token = new EnjoyLifeCoinToken();

  event TransferWei(address indexed addr, uint amount);

  function Crowdsale(uint _startPreICO, uint _startICO, uint _endICO) {
    startPreICO = _startPreICO;
    startICO = _startICO;
    endICO = _endICO;
  }

  modifier preIcoOn() { require(startPreICO < now && now < startICO); _; }
  modifier icoOn() { require(startICO < now && now < endICO); _; }

  function createPreIcoTokens() preIcoOn payable {
    uint valueUSD = msg.value.mul(100).mul(currentRateUSD).div(1 ether);
    uint remainderTokens = maxCapPreICO.sub(tokensCountPreICO);

    if (valueUSD >= minInvestmentPreICO && remainderTokens > 0) {
      uint surrender;
      uint totalValue = msg.value;

      // Check for surrender by rate
      uint surrenderUSD = valueUSD.mod(rate);
      if (surrenderUSD > 0) {
        surrender = surrenderUSD.mul(1 ether).div(currentRateUSD);

        msg.sender.transfer(surrender);
        TransferWei(msg.sender, surrender);
        totalValue = totalValue.sub(surrender);
      }

      uint tokens = valueUSD.sub(surrenderUSD).div(rate);
      uint bonusTokens = tokens >> 1;
      uint tokensWithBonus = tokens + bonusTokens;

      // Check for surrender by remaining tokens
      if (tokens > remainderTokens) {
        uint overTokens = tokens.sub(remainderTokens);
        surrender = overTokens.mul(rate).mul(1 ether).div(100).div(currentRateUSD);

        msg.sender.transfer(surrender);
        TransferWei(msg.sender, surrender);
        totalValue = totalValue.sub(surrender);

        tokensWithBonus = remainderTokens;
      } else if (tokensWithBonus > remainderTokens) {
        tokensWithBonus = remainderTokens;
      }

      tokensCountPreICO = tokensCountPreICO.add(tokensWithBonus);
      balancesPreICO[msg.sender] = balancesPreICO[msg.sender].add(totalValue);

      token.transfer(msg.sender, tokensWithBonus);
    } else {
      revert();
    }
  }

  function createIcoTokens() icoOn payable {
    uint valueUSD = msg.value.mul(100).mul(currentRateUSD).div(1 ether);
    // TODO: ADD Remainder
    if (valueUSD >= minInvestmentICO) {
      uint totalValue = msg.value;

      // Check for surrender by rate
      uint surrenderUSD = valueUSD.mod(rate);
      if (surrenderUSD > 0) {
        uint surrender = surrenderUSD.mul(1 ether).div(currentRateUSD);

        msg.sender.transfer(surrender);
        TransferWei(msg.sender, surrender);
        totalValue = totalValue.sub(surrender);
      }

      uint tokens = valueUSD.sub(surrenderUSD).mul(100).div(rate);

      // Сalculation of bonuses by days
      uint bonusTokens;
      if (now > startICO + 12 days) {} else if (now > startICO + 9 days) {
        bonusTokens = tokens.div(20);           // 5%
      } else if (now > startICO + 6 days) {
        bonusTokens = tokens.div(10);           // 10%
      } else if (now > startICO + 3 days) {
        bonusTokens = tokens.mul(15).div(100);  // 15%
      } else {
        bonusTokens = tokens.div(5);            // 20%
      }
      uint tokensWithBonus = tokens + bonusTokens;

      tokensCountICO = tokensCountICO.add(tokensWithBonus);
      balancesICO[msg.sender] = balancesICO[msg.sender].add(totalValue);

      token.transfer(msg.sender, tokensWithBonus);
    } else {
      revert();
    }
  }

  function() payable {
    if (startICO < now && now < endICO) {
      createIcoTokens();
    } else if (startPreICO < now && now < startICO) {
      createPreIcoTokens();
    } else {
      revert();
    }
  }
}