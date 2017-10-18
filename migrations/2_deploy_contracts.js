const Crowdsale = artifacts.require("./Crowdsale.sol");

module.exports = function(deployer) {
  // Parametrs:
  // - beginning of pre-ICO
  // - beginning of ICO
  // - end of ICO
  // - token rate (cents)
  // - number of days from the beginning of the ISO and to the burning of the tokens
  deployer.deploy(Crowdsale, 1509530400, 1512122400, 1515967200, 50, 5);
};
