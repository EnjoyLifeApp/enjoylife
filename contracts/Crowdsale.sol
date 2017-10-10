pragma solidity ^0.4.15;

import "./Ownable.sol";
import "./SafeMath.sol";
import "./EnjoyLifeCoinToken.sol";

contract Crowdsale is Ownable {
  using SafeMath for uint;

  EnjoyLifeCoinToken public token = new EnjoyLifeCoinToken();

  enum DistributionStages { initial, minCapMet, threeMillions, fiveMillions, sevenMillions, finishes }
  DistributionStages public currentStage = DistributionStages.initial;

  address feeAccount;         // 0xdA39e0Ce2adf93129D04F53176c7Bfaaae8B051a
  address bountyAccount;      // 0x0064952457905eBFB9c0292200A74B1d7414F081
  address projectTeamAccount; // 0x980F0A3fEDc9D5236C787A827ab7c2276227D78d
  address otherAccount;       // 0x3433974240b95bafc8705074c0859cee92a562f8

  mapping(address => uint) public balancesICO;

  uint public startPreICO; // 01.11.2017 12:00 UTC+2 --> 1509530400
  uint public startICO;    // 01.12.2017 12:00 UTC+2 --> 1512122400
  uint public endICO;      // 15.01.2018 00:00 UTC+2 --> 1515967200

  uint public constant rate = 50;                   // 0.5 USD
  uint public constant minInvestmentPreICO = 20000; // 200 USD
  uint public constant minInvestmentICO = 5000;     // 50 USD
  uint public constant currentRateUSD = 30000;      // 300 USD = 1 ether

  uint public decimals = 100; // 10**uint(token.decimals());

  uint constant minCapICO = 160000000;    // 1 600 000 tokens
  uint constant maxCapPreICO = 100000000; // 1 000 000 tokens

  uint public tokensCountPreICO;
  uint public tokensCountICO;

  event TransferWei(address indexed addr, uint amount);

  function Crowdsale(uint _startPreICO, uint _startICO, uint _endICO) {
    startPreICO = _startPreICO;
    startICO = _startICO;
    endICO = _endICO;
  }

  modifier preIcoOn() { require(startPreICO < now && now < startICO); _; }
  modifier icoOn() { require(startICO < now && now < endICO); _; }

  function createPreIcoTokens() preIcoOn payable {
    uint valueUSD = msg.value.mul(decimals).mul(currentRateUSD).div(1 ether);
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
      uint tokensWithBonus = tokens + tokens >> 1;

      // Check for surrender by remaining tokens
      if (tokens > remainderTokens) {
        uint overTokens = tokens.sub(remainderTokens);
        surrender = overTokens.mul(rate).mul(1 ether).div(decimals).div(currentRateUSD);

        msg.sender.transfer(surrender);
        TransferWei(msg.sender, surrender);
        totalValue = totalValue.sub(surrender);

        tokensWithBonus = remainderTokens;
      } else if (tokensWithBonus > remainderTokens) {
        tokensWithBonus = remainderTokens;
      }
      tokensCountPreICO = tokensCountPreICO.add(tokensWithBonus);
      token.transfer(msg.sender, tokensWithBonus);

      // Distribute funds
      uint projectTeamValue = msg.value.mul(95).div(100);
      uint feeValue = msg.value.sub(projectTeamValue);
      projectTeamAccount.transfer(projectTeamValue);       // 95%
      feeAccount.transfer(feeValue);                       // 5%
      TransferWei(projectTeamAccount, projectTeamValue);
      TransferWei(feeAccount, feeValue);
    } else {
      revert();
    }
  }

  function distribute() internal {
    uint total = this.balance;
    uint otherValue = total >> 2;                                 // 50%
    uint feeValue = total.div(20);                                // 5%
    uint projectTeamValue = total.sub(otherValue).sub(feeValue);  // 45%
    feeAccount.transfer(feeValue);
    projectTeamAccount.transfer(projectTeamValue);
    otherAccount.transfer(otherValue);
    TransferWei(feeAccount, feeValue);
    TransferWei(projectTeamAccount, projectTeamValue);
    TransferWei(otherAccount, otherValue);
  }

  function ethDistribution() internal {
    uint total = tokensCountPreICO + tokensCountICO;
    if (currentStage == DistributionStages.initial && total >= minCapICO) {
      currentStage = DistributionStages.minCapMet; distribute();
    } else if (currentStage == DistributionStages.minCapMet && total >= 300000000) {
      currentStage = DistributionStages.threeMillions; distribute();
    } else if (currentStage == DistributionStages.threeMillions && total >= 500000000) {
      currentStage = DistributionStages.fiveMillions; distribute();
    } else if (currentStage == DistributionStages.fiveMillions && total >= 700000000) {
      currentStage = DistributionStages.sevenMillions; distribute();
    } else if (currentStage == DistributionStages.sevenMillions && total == token.INITIAL_SUPPLY()) {
      currentStage = DistributionStages.finishes; distribute();
    }
  }

  function bonusCalculationICO(uint _tokens) internal returns(uint) {
    if (now > startICO + 12 days) {} else if (now > startICO + 9 days) {
      return _tokens.div(20);                // 5%
    } else if (now > startICO + 6 days) {
      return _tokens.div(10);                // 10%
    } else if (now > startICO + 3 days) {
      return _tokens.mul(15).div(decimals);  // 15%
    } else {
      return _tokens.div(5);                 // 20%
    }
  }

  function createIcoTokens() icoOn payable {
    uint valueUSD = msg.value.mul(decimals).mul(currentRateUSD).div(1 ether);
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

      uint tokens = valueUSD.sub(surrenderUSD).mul(decimals).div(rate);
      uint tokensWithBonus = tokens + bonusCalculationICO(tokens);

      tokensCountICO = tokensCountICO.add(tokensWithBonus);
      balancesICO[msg.sender] = balancesICO[msg.sender].add(totalValue);

      token.transfer(msg.sender, tokensWithBonus);
    } else {
      revert();
    }
  }

  function sendToAddress(address _address, uint _tokens) onlyOwner {
    uint tempTokens = _tokens.mul(decimals);
    uint remainderTokens = token.balanceOf(this);
    token.transfer(_address, tempTokens > remainderTokens ? remainderTokens : tempTokens);
  }

  function sendToAddressWithTime(address _address, uint _tokens, uint _time) onlyOwner {
    if (startPreICO < _time && _time < endICO) {
      uint bonus;
      uint tempTokens = _tokens.mul(decimals);
      if (_time < startICO) {
        bonus = tempTokens >> 1;
      } else {
        bonus = bonusCalculationICO(tempTokens);
      }
      uint tokensWithBonus = tempTokens + bonus;
      uint remainderTokens = token.balanceOf(this);
      token.transfer(_address, tokensWithBonus > remainderTokens ? remainderTokens : tokensWithBonus);
    }
  }

  function getTokens() public constant returns (uint) {
    return token.INITIAL_SUPPLY();
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
