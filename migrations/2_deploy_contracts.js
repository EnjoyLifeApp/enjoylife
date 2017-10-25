const Crowdsale = artifacts.require("./Crowdsale.sol");

module.exports = function(deployer) {
  // Parametrs:
  // - beginning of pre-ICO
  // - end of pre-ICO
  // - beginning of ICO
  // - end first round of ICO
  // - token rate (cents)
  // - number of days from the end of the ISO and to the burning of the tokens
  deployer.deploy(Crowdsale, 1509530400, 1510783200, 1512122400, 1515967200, 50, 5);
};
