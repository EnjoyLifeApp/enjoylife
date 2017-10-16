import React, { Component } from 'react';
import moment from 'moment';

import CrowdsaleContract from '../build/contracts/Crowdsale.json';
import getWeb3 from './utils/getWeb3';

import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';
import 'bootstrap/dist/css/bootstrap.css';
import './css/App.css';

import { Navbar, Row, Col, Input } from 'reactstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import lightBaseTheme from 'material-ui/styles/baseThemes/lightBaseTheme';
const lightMuiTheme = getMuiTheme(lightBaseTheme);

import RaisedButton from 'material-ui/RaisedButton';
import DatePicker from 'material-ui/DatePicker';
import TimePicker from 'material-ui/TimePicker';

const contract = require('truffle-contract');

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // Information on sale
      tokenRate: 0,
      usdRate: 0,
      minInvestmentPreICO: 0,
      minInvestmentICO: 0,

      // Manual send
      timestamp: (new Date()).toLocaleString(),

      // Start new round
      newRoundStart: (new Date()).toLocaleString()
    }
  }

  async componentWillMount() {
    try {
      const web3 = (await getWeb3).web3;
      const crowdsale = contract(CrowdsaleContract);

      // Crowdsale initialization
      crowdsale.setProvider(web3.currentProvider);
      const instance = await crowdsale.deployed();
      const [
        owner, tokenAddress, startPreICO,
        startICO, endICO, tokenRate,
        usdRate, minInvestmentPreICO, minInvestmentICO,
        currentRound, tokensCountPreICO, tokensCountICO,
        numInvestors
      ] = await Promise.all([
        instance.owner.call(), instance.token.call(), instance.startPreICO.call(),
        instance.startICO.call(), instance.endICO.call(), instance.rate.call(),
        instance.currentRateUSD.call(), instance.minInvestmentPreICO.call(), instance.minInvestmentICO.call(),
        instance.currentRound.call(), instance.tokensCountPreICO.call(), instance.tokensCountICO.call(),
        instance.getAllInvestors.call()
      ]);

      // Enjoy life token initialization
      const file = require('../build/contracts/EnjoyLifeCoinToken.json');
      const enjoyLifeCoinToken = contract({abi: file.abi});
      enjoyLifeCoinToken.setProvider(web3.currentProvider);
      const instanceToken = enjoyLifeCoinToken.at(tokenAddress);

      const [tokenName, tokenSymbol, decimals, initialSupply, myTokens] = await Promise.all([
        instanceToken.name.call(), instanceToken.symbol.call(),
        instanceToken.decimals.call(), instanceToken.initialSupply.call(),
        instanceToken.balanceOf(web3.eth.accounts[0])
      ]);
      const decimalsNum = decimals.toNumber();
      const divider = Math.pow(10, decimalsNum);

      // Get info about investors
      let investorsTokens = [];
      for (let i = 0; i < numInvestors; i++) {
        const address = await instance.investors.call(i);
        const tokens = await instance.investorsTokens.call(address);
        investorsTokens.push({ address: address, tokens: tokens.toNumber() / divider });
      }

      this.setState({
        // Information on contracts
        web3: web3,
        instanceCrowdsale: instance,
        instanceToken: instanceToken,

        // Information on the token
        tokenAddress: tokenAddress,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        decimals: decimalsNum,
        initialSupply: initialSupply.toNumber() / divider,

        // Information on the crowdsale
        crowdsaleAddress: crowdsale.address,
        owner: owner,
        startPreICO: new Date(startPreICO * 1000).toLocaleString(),
        startICO: new Date(startICO * 1000).toLocaleString(),
        endICO: new Date(endICO * 1000).toLocaleString(),
        tokenRate: tokenRate.toNumber() / divider,
        usdRate: usdRate.toNumber() / divider,
        minInvestmentPreICO: minInvestmentPreICO.toNumber() / divider,
        minInvestmentICO: minInvestmentICO.toNumber() / divider,

        // Round information
        roundNumber: currentRound[0].toNumber(),
        roundStart: new Date(currentRound[1] * 1000).toLocaleString(),
        roundRemaining: currentRound[2].toNumber() / divider,

        // My info
        myAddress: web3.eth.accounts[0],
        myTokens: myTokens.toNumber() / 100,

        // Statistics
        tokensCountPreICO: tokensCountPreICO.toNumber() / 100,
        tokensCountICO: tokensCountICO.toNumber() / 100,
        numInvestors: numInvestors.toNumber(),
        investorsTokens: investorsTokens
      });
    } catch (error) {
      console.log(error);
    }
  }

  showDatePicker(f) {
    this.refs.manualDP.openDialog();
    this.setState({ flag: f });
    console.log('showDatePicker');
  }

  showTimePicker(event) {
    this.refs.manualTP.openDialog();
    this.setState({ datePicker: event });
    console.log('showTimePicker', event);
  }

  setTimePicker(time) {
    time.setDate(this.state.datePicker.getDate());
    time.setMonth(this.state.datePicker.getMonth());
    time.setFullYear(this.state.datePicker.getFullYear());
    time.setSeconds(0);
    this.setState(this.state.flag === 'manual' ? { timestamp: time.toLocaleString() } : { newRoundStart: time.toLocaleString() } );
  }

  render() {
    return (
      <div className='App'>
        <Navbar className='myNavbar'>
          <div className='navbar-brand'>Enjoy life token ICO</div>
        </Navbar>
        <Row>
          <Col md={{ size: 8 }}>
            <div className='main-container'>
              <Row>
                <Col>
                  <h4>My information</h4>
                  <hr className='my-2'/>
                  <Row><Col><label>Address</label></Col></Row>
                  <Row className='form-group'>
                    <Col>
                      <Input disabled={true} value={this.state.myAddress} />
                    </Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 8 }}><label>Tokens bought by me</label></Col>
                    <Col md={{ size: 4 }}>{this.state.myTokens}</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 8 }}><label>Left tokens in the current round</label></Col>
                    <Col md={{ size: 4 }}>{this.state.roundRemaining}</Col>
                  </Row>
                  <label><strong>Buying tokens</strong></label>
                  <Row>
                    <Col>
                      <Input
                        type='number'
                        value={this.state.amount}
                        onChange={e => this.setState({ amount: e.target.value })}
                        placeholder='Enter amount (ETH)'
                        onKeyDown={this.handleSubmit}
                      />
                    </Col>
                    <Col>
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <RaisedButton label='Buy' primary={true} />
                      </MuiThemeProvider>
                    </Col>
                  </Row>
                </Col>
                <Col>
                  <Row>
                    <Col>
                      <h4>Information on sale</h4>
                      <hr className='my-2'/>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 10 }}><label>ETH/USD</label></Col>
                    <Col md={{ size: 2 }}>{this.state.usdRate}$</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 10 }}><label>Token rate</label></Col>
                    <Col md={{ size: 2 }}>{this.state.tokenRate}$</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 10 }}><label>Minimum investment for pre-ICO</label></Col>
                    <Col md={{ size: 2 }}>{this.state.minInvestmentPreICO}$</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 10 }}><label>Minimum investment for ICO</label></Col>
                    <Col md={{ size: 2 }}>{this.state.minInvestmentICO}$</Col>
                  </Row>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Row>
                    <Col>
                      <h4>Manual send Token to Investor</h4>
                      <hr className='my-2'/>
                    </Col>
                  </Row>
                  <Row className='form-group'>
                    <Col md={{ size: 4 }}><div className='mylabel'>Investor address</div></Col>
                    <Col md={{ size: 6, pull: 1 }}>
                      <Input
                        value={this.state.investorAddress}
                        onChange={e => this.setState({ investorAddress: e.target.value })}
                        onKeyDown={this.handleSubmit}
                        className='form-control-sm'
                      />
                    </Col>
                  </Row>
                  <Row className='form-group'>
                    <Col md={{ size: 4 }}><div className='mylabel'>Amount tokens</div></Col>
                    <Col md={{ size: 6, pull: 1 }}>
                      <Input
                        type='number'
                        value={this.state.investorTokens}
                        onChange={e => this.setState({ investorTokens: e.target.value })}
                        onKeyDown={this.handleSubmit}
                        className='form-control-sm'
                      />
                    </Col>
                  </Row>
                  <Row className='form-group'>
                    <Col md={{ size: 4 }}><div className='mylabel'>Bonus tokens</div></Col>
                    <Col md={{ size: 6, pull: 1 }}>
                      <Input
                        type='number'
                        value={this.state.investorBonuses}
                        onChange={e => this.setState({ investorBonuses: e.target.value })}
                        onKeyDown={this.handleSubmit}
                        className='form-control-sm'
                      />
                    </Col>
                  </Row>
                  <Row className='form-group'>
                    <Col md={{ size: 4 }}><div className='mylabel'>Timestamp</div></Col>
                    <Col md={{ size: 6, pull: 1 }}>
                      <Input
                        readOnly
                        value={this.state.timestamp}
                        onFocus={() => this.showDatePicker('manual')}
                        onKeyDown={this.handleSubmit}
                      />
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <div>
                          <DatePicker
                            id='manualDP'
                            ref='manualDP'
                            onChange={(x, event) => { this.showTimePicker(event) } }
                            style={{ display: 'none' }}
                          />
                          <TimePicker
                            id='manualTP'
                            ref='manualTP'
                            onChange={(x, time) => { this.setTimePicker(time) }}
                            style={{ display: 'none' }}
                          />
                        </div>
                      </MuiThemeProvider>
                    </Col>
                  </Row>
                  <MuiThemeProvider muiTheme={lightMuiTheme}>
                    <RaisedButton label='Send' primary={true} />
                  </MuiThemeProvider>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Row>
                    <Col>
                      <h4>Statistics</h4>
                      <hr className='my-2'/>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 8 }}>
                      <Row>
                        <Col><label>Number of tokens sold at pre-ICO</label></Col>
                        <Col>{this.state.tokensCountPreICO}</Col>
                      </Row>
                      <Row>
                        <Col><label>Number of tokens sold at ICO</label></Col>
                        <Col>{this.state.tokensCountICO}</Col>
                      </Row>
                      <Row>
                        <Col><label>Investors Count</label></Col>
                        <Col>{this.state.numInvestors}</Col>
                      </Row>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <BootstrapTable data={this.state.investorsTokens} version='4' striped={true} hover={true}>
                        <TableHeaderColumn dataField='address' isKey={true}>Investor's address</TableHeaderColumn>
                        <TableHeaderColumn dataField='tokens'>Tokens</TableHeaderColumn>
                      </BootstrapTable>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </div>
          </Col>
          <Col md={{ size: 4 }} className='mySidebar'>
            <div className='small-container'>
              <Row>
                <Col>
                  <h5>Token info</h5>
                  <hr className='my-2'/>
                </Col>
              </Row>
              <Row><Col>Address</Col></Row>
              <Row className='form-group'>
                <Col>
                  <Input disabled={true} value={this.state.tokenAddress} />
                </Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Name</label></Col>
                <Col md={{ size: 5 }}>{this.state.tokenName}</Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Symbol</label></Col>
                <Col md={{ size: 5 }}>{this.state.tokenSymbol}</Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Decimals</label></Col>
                <Col md={{ size: 5 }}>{this.state.decimals}</Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Initial supply</label></Col>
                <Col md={{ size: 5 }}>{this.state.initialSupply}</Col>
              </Row>
              <Row>
                <Col>
                  <h5>Crowdsale info</h5>
                  <hr className='my-2'/>
                </Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Beginning of pre-ICO</label></Col>
                <Col md={{ size: 5 }}>{this.state.startPreICO}</Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Beginning of ICO</label></Col>
                <Col md={{ size: 5 }}>{this.state.startICO}</Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>End of ICO</label></Col>
                <Col md={{ size: 5 }}>{this.state.endICO}</Col>
              </Row>
              <Row>
                <Col>
                  <h5>Round info</h5>
                  <hr className='my-2'/>
                </Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Number of the current round</label></Col>
                <Col md={{ size: 5 }}>{this.state.roundNumber}</Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Beginning of the round</label></Col>
                <Col md={{ size: 5 }}>{this.state.roundStart}</Col>
              </Row>
              <Row className='form-group'>
                <Col md={{ size: 12 }}>
                  <label><strong>Start a new round (owner)</strong></label>
                </Col>
                <Col>
                  <Input
                    type='number'
                    value={this.state.tokenRate}
                    onChange={e => this.setState({ tokenRate: e.target.value })}
                    placeholder='Enter new rate (USD)'
                    onKeyDown={this.handleSubmit}
                  />
                </Col>
                <Col>
                  <Input
                    readOnly
                    value={this.state.newRoundStart}
                    onFocus={() => this.showDatePicker('round')}
                    onKeyDown={this.handleSubmit}
                  />
                </Col>
              </Row>
              <MuiThemeProvider muiTheme={lightMuiTheme}>
                <RaisedButton label='Start' primary={true} />
              </MuiThemeProvider>
              <Row>
                <Col>
                  <h5>Contract info</h5>
                  <hr className='my-2'/>
                </Col>
              </Row>
              <Row><Col><label>Address</label></Col></Row>
              <Row className='form-group'>
                <Col>
                  <Input disabled={true} value={this.state.crowdsaleAddress} />
                </Col>
              </Row>
              <Row><Col><label>Owner</label></Col></Row>
              <Row className='form-group'>
                <Col>
                  <Input disabled={true} value={this.state.owner} />
                </Col>
              </Row>
              <Row className='form-group'>
                <Col>
                  <label><strong>Transfer Ownership (owner)</strong></label>
                  <Input
                    value={this.state.newOwner}
                    onChange={e => this.setState({ newOwner: e.target.value })}
                    placeholder='Enter address'
                    onKeyDown={this.handleSubmit}
                  />
                </Col>
              </Row>
              <MuiThemeProvider muiTheme={lightMuiTheme}>
                <RaisedButton label='Submit' primary={true} />
              </MuiThemeProvider>
            </div>
          </Col>
        </Row>
      </div>
    );
  }
}

export default App
