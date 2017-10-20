pragma solidity ^0.4.15;

import './Ownable.sol';
import './SafeMath.sol';
import './EnjoyLifeCoinToken.sol';
import './OraclizeWrapper.sol';

contract Crowdsale is Ownable {
  using SafeMath for uint;

  EnjoyLifeCoinToken public token = new EnjoyLifeCoinToken();
  OraclizeWrapper public oraclize = new OraclizeWrapper();

  enum DistributionStages { initial, minCapMet, threeMillions, fiveMillions, sevenMillions }
  DistributionStages public currentStage = DistributionStages.initial;

  struct Round {
    uint number;
    uint start;
    uint rate;
    uint remaining;
    uint reserveBounty;
    uint reserveTeam;
  }
  Round public currentRound;

  address feeAccount = 0xdA39e0Ce2adf93129D04F53176c7Bfaaae8B051a;
  address bountyAccount = 0x0064952457905eBFB9c0292200A74B1d7414F081;
  address projectTeamAccount = 0x980F0A3fEDc9D5236C787A827ab7c2276227D78d;
  address otherAccount = 0x3433974240b95bafc8705074c0859cee92a562f8;

  mapping(address => uint) public investorsTokens;
  address[] public investors;
  mapping(address => uint) public balancesICO;
  uint public getBalanceContract;
  uint public burnTime;

  uint public startPreICO; // 01.11.2017 12:00 UTC+2 --> 1509530400
  uint public startICO;    // 01.12.2017 12:00 UTC+2 --> 1512122400
  uint public endICO;      // 15.01.2018 00:00 UTC+2 --> 1515967200

  uint public constant minInvestmentPreICO = 20000; // 200 USD
  uint public constant minInvestmentICO = 5000;     // 50 USD

  uint constant decimals = 100; // 10**uint(token.decimals());
  uint constant maximumSoldTokens = 917431100;

  uint public constant minCapICO = 16E7;   // 1 600 000 tokens
  uint public constant maxCapPreICO = 1E8; // 1 000 000 tokens

  uint public tokensCountPreICO;
  uint public tokensCountICO;

  event TransferWei(address indexed addr, uint amount);

  function Crowdsale(uint _startPreICO, uint _startICO, uint _endICO, uint _rate, uint _burnTime) {
    startPreICO = _startPreICO;
    startICO = _startICO;
    endICO = _endICO;
    burnTime = _burnTime;

    currentRound = Round({
      number: 1,
      start: _startPreICO,
      rate: _rate,
      remaining: maximumSoldTokens,
      reserveBounty: 0,
      reserveTeam: 0
    });
  }

  modifier preIcoOn() { require(startPreICO < now && now < startICO); _; }
  modifier icoOn() { require(startICO < now && now < endICO); _; }

  function bytesToUInt(bytes32 v) constant returns (uint ret) {
    if (v == 0x0) {
      revert();
    }

    uint digit;
    for (uint i = 0; i < 32; i++) {
      digit = uint((uint(v) / (2 ** (8 * (31 - i)))) & 0xff);
      if (digit == 0) {
        break;
      } else if (digit < 48 || digit > 57) {
        revert();
      }
      ret *= 10;
      ret += (digit - 48);
    }
    return ret;
  }

  function currentRateUSD() public constant returns (uint) {
    return bytesToUInt(oraclize.getRate());
  }

  function calculationNumberInvestors(address _addr, uint _tokens) internal {
    if (investorsTokens[_addr] == 0) investors.push(_addr);
    investorsTokens[_addr] = investorsTokens[_addr].add(_tokens);
  }

  function createPreIcoTokens() preIcoOn payable {
    uint valueUSD = msg.value.mul(currentRateUSD()).div(1 ether);
    uint remainderTokens = maxCapPreICO.sub(tokensCountPreICO);

    if (valueUSD >= minInvestmentPreICO && remainderTokens > 0) {
      uint totalValue = msg.value;

      uint tokens = valueUSD.mul(decimals).div(currentRound.rate);
      uint tokensWithBonus = tokens.add(tokens >> 1); // + 50% tokens

      // Check for surrender by remaining tokens
      if (tokens > remainderTokens) {
        uint overTokens = tokens.sub(remainderTokens);
        uint surrender = overTokens.mul(currentRound.rate).mul(1 ether).div(decimals).div(currentRateUSD());

        msg.sender.transfer(surrender);
        TransferWei(msg.sender, surrender);
        totalValue = totalValue.sub(surrender);

        tokensWithBonus = remainderTokens;
      } else if (tokensWithBonus > remainderTokens) {
        tokensWithBonus = remainderTokens;
      }
      tokensCountPreICO = tokensCountPreICO.add(tokensWithBonus);
      currentRound.remaining = currentRound.remaining.sub(tokensWithBonus);
      getBalanceContract = getBalanceContract.add(totalValue);
      calculationNumberInvestors(msg.sender, tokensWithBonus);
      token.transfer(msg.sender, tokensWithBonus);

      // Distribute funds
      uint projectTeamValue = msg.value.mul(95).div(100);
      uint feeValue = msg.value.sub(projectTeamValue);
      projectTeamAccount.transfer(projectTeamValue);       // 95% eth
      feeAccount.transfer(feeValue);                       // 5% eth
      TransferWei(projectTeamAccount, projectTeamValue);
      TransferWei(feeAccount, feeValue);
    } else {
      revert();
    }
  }

  function distribute() internal {
    uint total = this.balance;
    uint otherValue = total >> 1;                                 // 50% eth
    uint feeValue = total.div(20);                                // 5% eth
    uint projectTeamValue = total.sub(otherValue).sub(feeValue);  // 45% eth
    feeAccount.transfer(feeValue);
    projectTeamAccount.transfer(projectTeamValue);
    otherAccount.transfer(otherValue);
    TransferWei(feeAccount, feeValue);
    TransferWei(projectTeamAccount, projectTeamValue);
    TransferWei(otherAccount, otherValue);
  }

  function ethDistribution() internal {
    uint total = tokensCountPreICO + tokensCountICO;
    if (total >= 7E8 && currentStage < DistributionStages.sevenMillions) {           // 7 000 000 tokens
      currentStage = DistributionStages.sevenMillions; distribute();
    } else if (total >= 5E8 && currentStage < DistributionStages.fiveMillions) {     // 5 000 000 tokens
      currentStage = DistributionStages.fiveMillions; distribute();
    } else if (total >= 3E8 && currentStage < DistributionStages.threeMillions) {    // 3 000 000 tokens
      currentStage = DistributionStages.threeMillions; distribute();
    } else if (total >= minCapICO && currentStage == DistributionStages.initial) {
      currentStage = DistributionStages.minCapMet; distribute();
    }
  }

  function manualDistribute() onlyOwner {
    require(now > endICO && (tokensCountPreICO + tokensCountICO) > minCapICO);

    distribute();
  }

  function bonusCalculationICO(uint _tokens) internal returns(uint) {
    if (now > startICO + 12 days) {} else if (now > startICO + 9 days) {
      return _tokens.div(20);                // + 5% tokens
    } else if (now > startICO + 6 days) {
      return _tokens.div(10);                // + 10% tokens
    } else if (now > startICO + 3 days) {
      return _tokens.mul(15).div(decimals);  // + 15% tokens
    } else {
      return _tokens.div(5);                 // + 20% tokens
    }
  }

  function createIcoTokens() icoOn payable {
    uint valueUSD = msg.value.mul(currentRateUSD()).div(1 ether);
    if (now > currentRound.start && valueUSD >= minInvestmentICO && currentRound.remaining > 0) {
      uint totalValue = msg.value;

      uint tokens = valueUSD.mul(decimals).div(currentRound.rate);
      uint tokensWithBonus = tokens.add(bonusCalculationICO(tokens));

      // Check for surrender by remaining tokens
      if (tokens > currentRound.remaining) {
        uint overTokens = tokens.sub(currentRound.remaining);
        uint surrender = overTokens.mul(currentRound.rate).mul(1 ether).div(decimals).div(currentRateUSD());

        msg.sender.transfer(surrender);
        TransferWei(msg.sender, surrender);
        totalValue = totalValue.sub(surrender);

        tokensWithBonus = currentRound.remaining;
      } else if (tokensWithBonus > currentRound.remaining) {
        tokensWithBonus = currentRound.remaining;
      }

      tokensCountICO = tokensCountICO.add(tokensWithBonus);
      currentRound.remaining = currentRound.remaining.sub(tokensWithBonus);
      balancesICO[msg.sender] = balancesICO[msg.sender].add(totalValue);
      getBalanceContract = getBalanceContract.add(totalValue);
      calculationNumberInvestors(msg.sender, tokensWithBonus);
      token.transfer(msg.sender, tokensWithBonus);
      ethDistribution();
    } else {
      revert();
    }
  }

  function countingTokens(address _addr, uint _tokens, uint _time) internal {
    if (_time < startICO) {
      tokensCountPreICO = tokensCountPreICO.add(_tokens);
    } else {
      tokensCountICO = tokensCountICO.add(_tokens);
    }
    currentRound.remaining = currentRound.remaining.sub(_tokens);
    calculationNumberInvestors(_addr, _tokens);
    token.transfer(_addr, _tokens);
  }

  function sendToAddress(address _address, uint _tokens, uint _time) onlyOwner {
    uint time = _time > 0 ? _time : now;
    require(startPreICO < time && time < endICO);

    uint tokensWithBonus;
    uint remainderTokens;
    if (time < startICO) {
      tokensWithBonus = _tokens.add(_tokens >> 1);
      remainderTokens = maxCapPreICO.sub(tokensCountPreICO);
    } else {
      tokensWithBonus = _tokens.add(bonusCalculationICO(_tokens));
      remainderTokens = currentRound.remaining;
    }

    uint totalTokens = tokensWithBonus > remainderTokens ? remainderTokens : tokensWithBonus;

    assert(totalTokens > 0);
    countingTokens(_address, totalTokens, time);
    ethDistribution();
  }

  function sendToAddressWithBonus(address _address, uint _tokens, uint _bonus) onlyOwner {
    require(_tokens > 0 || _bonus > 0 && startPreICO < now && now < (endICO + burnTime * 1 days));

    uint tempTokens = _tokens.add(_bonus);
    uint remainderTokens = (now < startICO ? maxCapPreICO.sub(tokensCountPreICO) : currentRound.remaining);
    uint totalTokens = tempTokens > remainderTokens ? remainderTokens : tempTokens;

    assert(totalTokens > 0);
    countingTokens(_address, totalTokens, now);
    ethDistribution();
  }

  function startingNewRound(uint _start, uint _rate) onlyOwner {
    require(_start > startICO && _start < endICO && _start > now && _rate > 0 && currentRound.remaining == 0);

    uint numberRounds = token.initialSupply().div(1E9); // 10 000 000 tokens

    assert(currentRound.number < numberRounds);
    currentRound.number = currentRound.number.add(1);
    currentRound.start = _start;
    currentRound.rate = _rate;
    currentRound.remaining = maximumSoldTokens;                              // remainder
    currentRound.reserveBounty = currentRound.reserveBounty.add(203873500);  // 2% of sold tokens
    currentRound.reserveTeam = currentRound.reserveTeam.add(713557600);      // 7% of sold tokens
  }

  function refund() {
    require(now > endICO && (tokensCountPreICO + tokensCountICO) < minCapICO);

    msg.sender.transfer(balancesICO[msg.sender]);
    TransferWei(msg.sender, balancesICO[msg.sender]);
    balancesICO[msg.sender] = 0;
  }

  function burnTokens() onlyOwner {
    require(now > (endICO + burnTime * 1 days) && (tokensCountPreICO + tokensCountICO) > minCapICO);

    uint soldTokens = maximumSoldTokens.sub(currentRound.remaining);
    currentRound.remaining = 0;
    token.transfer(bountyAccount, soldTokens.div(50).add(currentRound.reserveBounty));            // 2% of sold tokens + previous rounds
    token.transfer(projectTeamAccount, soldTokens.mul(7).div(100).add(currentRound.reserveTeam)); // 7% of sold tokens + previous rounds
    token.burn(token.balanceOf(this));
  }

  function getTokens() public constant returns (uint) {
    return token.balanceOf(this);
  }

  function getSoldTokens() public constant returns (uint) {
    return token.initialSupply().sub(token.balanceOf(this));
  }

  function getAllInvestors() public constant returns (uint) {
    return investors.length;
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
