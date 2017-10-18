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
import {Tabs, Tab} from 'material-ui/Tabs';
import IconButton from 'material-ui/IconButton';
import ContentClear from 'material-ui/svg-icons/content/clear';

const contract = require('truffle-contract');

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // Addresses
      owner: '',
      myAddress: '',
      tokenAddress: '',
      crowdsaleAddress: '',

      // Information on sale
      usdRate: 0,
      minInvestmentPreICO: 0,
      minInvestmentICO: 0,

      // Manual send tokens
      investorAddressWithTime: '',
      investorTokensWithTime: '',
      investorTimestamp: new Date().getTime(),
      investorAddressWithBonus: '',
      investorTokensWithBonus: '',
      investorBonuses: '',

      // Start new round
      newTokenRate: '',
      newRoundStart: new Date(),

      // Transfer ownership
      newOwner: '',

      // Other
      myInvestments: 0,
      amount: '',
      tab: 'a',
      status: 'Unknown',
      refund: false,
      burn: false
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
        startICO, endICO, usdRate,
        minInvestmentPreICO, minInvestmentICO, currentRound,
        tokensCountPreICO, tokensCountICO, numInvestors,
        minCapICO, myInvestments
      ] = await Promise.all([
        instance.owner.call(), instance.token.call(), instance.startPreICO.call(),
        instance.startICO.call(), instance.endICO.call(), instance.currentRateUSD.call(),
        instance.minInvestmentPreICO.call(), instance.minInvestmentICO.call(),
        instance.currentRound.call(), instance.tokensCountPreICO.call(), instance.tokensCountICO.call(),
        instance.getAllInvestors.call(), instance.minCapICO.call(), instance.balancesICO.call(web3.eth.accounts[0])
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

      // Сheck the possibility of refund and burn
      // Refund: require(now > endICO && (tokensCountPreICO + tokensCountICO) < minCapICO);
      // Burn: require(now > endICO + 5 days && (tokensCountPreICO + tokensCountICO) > minCapICO);
      const refund = moment() > moment.unix(endICO) && (tokensCountPreICO + tokensCountICO) < minCapICO ? false : true;
      const burn = moment() > moment.unix(endICO).add(5, 'days') && (tokensCountPreICO + tokensCountICO) > minCapICO ? false : true;

      // Check the start of a new round (remaining tokens)
      // require(_start > startICO && _start < endICO && _start > now && _rate > 0 && currentRound.remaining == 0);
      const newRound = currentRound[3].toNumber() === 0 ? false : true;

      // Check the possibility of distributing tokens after the completion of the ICO
      // require(now > endICO && (tokensCountPreICO + tokensCountICO) > minCapICO);
      const distribute = moment() > moment.unix(endICO) && (tokensCountPreICO + tokensCountICO) > minCapICO ? false : true;

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
        divider: divider,
        initialSupply: initialSupply.toNumber() / divider,

        // Information on the crowdsale
        crowdsaleAddress: crowdsale.address,
        owner: owner,
        startPreICO: startPreICO,
        startICO: startICO,
        endICO: endICO,
        usdRate: usdRate.toNumber() / divider,
        minInvestmentPreICO: minInvestmentPreICO.toNumber() / divider,
        minInvestmentICO: minInvestmentICO.toNumber() / divider,

        // Button status
        refund: refund,
        burn: burn,
        newRound: newRound,
        distribute: distribute,

        // Round information
        roundNumber: currentRound[0].toNumber(),
        roundStart: new Date(currentRound[1] * 1000).toLocaleString(),
        roundRate: currentRound[2].toNumber() / divider,
        roundRemaining: currentRound[3].toNumber() / divider,

        // My info
        myAddress: web3.eth.accounts[0],
        myTokens: myTokens.toNumber() / divider,
        myInvestments: web3.fromWei(myInvestments.toNumber(), 'ether'),

        // Statistics
        tokensCountPreICO: tokensCountPreICO.toNumber() / divider,
        tokensCountICO: tokensCountICO.toNumber() / divider,
        numInvestors: numInvestors.toNumber(),
        investorsTokens: investorsTokens
      });

      this.checkStatus();
    } catch (error) {
      console.log(error);
    }
  }

  async updateState() {
    const { web3, instanceCrowdsale, instanceToken, divider } = this.state;

    // Fields update
    const [myTokens, tokensCountPreICO, tokensCountICO, numInvestors, currentRound, endICO, minCapICO, myInvestments] = await Promise.all([
      instanceToken.balanceOf(web3.eth.accounts[0]), instanceCrowdsale.tokensCountPreICO.call(),
      instanceCrowdsale.tokensCountICO.call(), instanceCrowdsale.getAllInvestors.call(),
      instanceCrowdsale.currentRound.call(), instanceCrowdsale.endICO.call(),
      instanceCrowdsale.minCapICO.call(), instanceCrowdsale.balancesICO.call(web3.eth.accounts[0])
    ]);

    // Get info about investors
    let investorsTokens = [];
    for (let i = 0; i < numInvestors; i++) {
      const address = await instanceCrowdsale.investors.call(i);
      const tokens = await instanceCrowdsale.investorsTokens.call(address);
      investorsTokens.push({ address: address, tokens: tokens.toNumber() / divider });
    }

    // Сheck the possibility of refund and burn
    // Refund: require(now > endICO && (tokensCountPreICO + tokensCountICO) < minCapICO);
    // Burn: require(now > endICO + 5 days && (tokensCountPreICO + tokensCountICO) > minCapICO);
    const refund = moment() > moment.unix(endICO) && (tokensCountPreICO + tokensCountICO) < minCapICO ? false : true;
    const burn = moment() > moment.unix(endICO).add(5, 'days') && (tokensCountPreICO + tokensCountICO) > minCapICO ? false : true;

    // Check the start of a new round (remaining tokens)
    // require(_start > startICO && _start < endICO && _start > now && _rate > 0 && currentRound.remaining == 0);
    const newRound = currentRound[3].toNumber() === 0 ? false : true;

    // Check the possibility of distributing tokens after the completion of the ICO
    // require(now > endICO && (tokensCountPreICO + tokensCountICO) > minCapICO);
    const distribute = moment() > moment.unix(endICO) && (tokensCountPreICO + tokensCountICO) > minCapICO ? false : true;

    this.setState({
      myTokens: myTokens.toNumber() / divider,
      myInvestments: web3.fromWei(myInvestments.toNumber(), 'ether'),
      tokensCountPreICO: tokensCountPreICO.toNumber() / divider,
      tokensCountICO: tokensCountICO.toNumber() / divider,
      numInvestors: numInvestors.toNumber(),
      investorsTokens: investorsTokens,

      // Button status
      refund: refund,
      burn: burn,
      newRound: newRound,
      distribute: distribute,

      // Round information
      roundNumber: currentRound[0].toNumber(),
      roundStart: new Date(currentRound[1] * 1000).toLocaleString(),
      roundRate: currentRound[2].toNumber() / divider,
      roundRemaining: currentRound[3].toNumber() / divider
    });

    this.checkStatus();
  }

  checkStatus() {
    const { startPreICO, startICO, endICO, refund } = this.state;
    let status = '';
    if (moment() < moment.unix(startPreICO)) {
      status = 'Waiting for pre-ICO to start';
    } else if (moment() < moment.unix(startICO)) {
      status = 'Pre-ICO in progress';
    } else if (moment() < moment.unix(endICO)) {
      status = 'ICO in progress';
    } else {
      status = refund ? 'ICO completed!' : 'ICO has failed!';
    }
    this.setState({ status: status });
  }

  showDatePicker(f) {
    this.refs.manualDP.openDialog();
    this.setState({ flag: f });
  }

  showTimePicker(event) {
    this.refs.manualTP.openDialog();
    this.setState({ datePicker: event });
  }

  setTimePicker(time) {
    time.setDate(this.state.datePicker.getDate());
    time.setMonth(this.state.datePicker.getMonth());
    time.setFullYear(this.state.datePicker.getFullYear());
    time.setSeconds(0);
    this.setState(this.state.flag === 'manual' ? { investorTimestamp: time.getTime() } : { newRoundStart: time } );
  }

  buyingTokens() {
    const { web3, amount, crowdsaleAddress } = this.state;
    web3.eth.sendTransaction({
      from: web3.eth.accounts[0],
      to: crowdsaleAddress,
      value: web3.toWei(amount, 'ether'),
      gas: 200000
    }, async (error, tx) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Tx:', tx);
      }
      this.updateState();
    });
  }

  async transferOwnership() {
    const { web3, instanceCrowdsale, newOwner } = this.state;
    await instanceCrowdsale.transferOwnership(newOwner, { from: web3.eth.accounts[0], gas: 100000 });
    const owner = await instanceCrowdsale.owner.call();

    this.setState({ owner: owner });
  }

  async startNewRound() {
    const { web3, instanceCrowdsale, newTokenRate, newRoundStart } = this.state;
    await instanceCrowdsale.startingNewRound(newRoundStart.getTime() / 1000, newTokenRate * 100, { from: web3.eth.accounts[0], gas: 200000 });

    this.updateState();
  }

  async manualSendTokensWithTime() {
    const {
      web3, instanceCrowdsale, investorAddressWithTime,
      investorTokensWithTime, investorTimestamp, divider
    } = this.state;

    await instanceCrowdsale.sendToAddress(
      investorAddressWithTime, investorTokensWithTime * divider, investorTimestamp / 1000,
      { from: web3.eth.accounts[0], gas: 200000 }
    );

    this.updateState();
  }

  async manualSendTokensWithBonus() {
    const {
      web3, instanceCrowdsale, divider,
      investorAddressWithBonus, investorTokensWithBonus, investorBonuses
    } = this.state;

    await instanceCrowdsale.sendToAddressWithBonus(
      investorAddressWithBonus, investorTokensWithBonus * divider,
      (typeof investorBonuses === 'undefined' ? 0 : investorBonuses * divider),
      { from: web3.eth.accounts[0], gas: 200000 }
    );

    this.updateState();
  }

  async refund() {
    const { web3, instanceCrowdsale } = this.state;
    await instanceCrowdsale.refund({ from: web3.eth.accounts[0] });

    console.log('refund');
    this.updateState();
  }

  async burn() {
    const { web3, instanceCrowdsale } = this.state;
    await instanceCrowdsale.burnTokens({ from: web3.eth.accounts[0] });

    console.log('burn');
    this.updateState();
  }

  async manualDistribute() {
    const { web3, instanceCrowdsale } = this.state;
    await instanceCrowdsale.manualDistribute({ from: web3.eth.accounts[0] });

    console.log('distribute');
    this.updateState();
  }

  clearTimestamp() {
    this.setState({ investorTimestamp: 0 });
  }

  tabChange = (tab) => {
    this.setState({ tab: tab });
  };

  renderManualSender() {
    const { myAddress, owner } = this.state;
    if ( owner.length > 0 && myAddress === owner) {
      return (
        <div>
          <Row>
            <Col>
              <h4>Manual send tokens to investor</h4>
              <hr className='my-2'/>
            </Col>
          </Row>
          <Row>
            <Col>
              <MuiThemeProvider muiTheme={lightMuiTheme}>
                <Tabs onChange={this.tabChange}>
                  <Tab label='Transfer tokens'>
                    <Row className='form-group' style={{ marginTop: '20px' }}>
                      <Col md={{ size: 4 }} style={{ display: 'flex' }}>
                        <div className='mylabel'>Investor address</div>
                        <div style={{ color: 'red', marginLeft: '5px' }}>*</div>
                      </Col>
                      <Col md={{ size: 6, pull: 1 }}>
                        <Input
                          value={this.state.investorAddressWithTime}
                          onChange={e => this.setState({ investorAddressWithTime: e.target.value })}
                          onKeyDown={this.handleSubmit}
                          placeholder='e.g. 0xc52a46cfba7ac9a9af0b24682595ab3359430f81'
                          className='form-control-sm'
                        />
                      </Col>
                    </Row>
                    <Row className='form-group'>
                      <Col md={{ size: 4 }} style={{ display: 'flex' }}>
                        <div className='mylabel'>Amount tokens</div>
                        <div style={{ color: 'red', marginLeft: '5px' }}>*</div>
                      </Col>
                      <Col md={{ size: 6, pull: 1 }}>
                        <Input
                          type='number'
                          value={this.state.investorTokensWithTime}
                          onChange={e => this.setState({ investorTokensWithTime: e.target.value })}
                          onKeyDown={this.handleSubmit}
                          placeholder='e.g. 100.46'
                          className='form-control-sm'
                        />
                      </Col>
                    </Row>
                    <Row className='form-group'>
                      <Col md={{ size: 4 }}><div className='mylabel'>Timestamp</div></Col>
                      <Col md={{ size: 6, pull: 1 }} style={{ display: 'flex' }}>
                        <Input
                          readOnly
                          value={this.state.investorTimestamp === 0 ? '' : moment(this.state.investorTimestamp).format('llll')}
                          onFocus={() => this.showDatePicker('manual')}
                          onKeyDown={this.handleSubmit}
                          className='form-control-sm'
                        />
                        <IconButton
                          onClick={() => this.clearTimestamp()}
                          style={{ width: 27, height: 27, padding: 0 }}
                        >
                          <ContentClear />
                        </IconButton>
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
                      </Col>
                    </Row>
                    <RaisedButton label='Send' primary={true} onClick={() => this.manualSendTokensWithTime()}/>
                  </Tab>
                  <Tab label='Transfer tokens (ignores bonus program)'>
                    <Row className='form-group' style={{ marginTop: '20px' }}>
                      <Col md={{ size: 4 }} style={{ display: 'flex' }}>
                        <div className='mylabel'>Investor address</div>
                        <div style={{ color: 'red', marginLeft: '5px' }}>*</div>
                      </Col>
                      <Col md={{ size: 6, pull: 1 }}>
                        <Input
                          value={this.state.investorAddressWithBonus}
                          onChange={e => this.setState({ investorAddressWithBonus: e.target.value })}
                          onKeyDown={this.handleSubmit}
                          placeholder='e.g. 0xc52a46cfba7ac9a9af0b24682595ab3359430f81'
                          className='form-control-sm'
                        />
                      </Col>
                    </Row>
                    <Row className='form-group'>
                      <Col md={{ size: 4 }} style={{ display: 'flex' }}>
                        <div className='mylabel'>Amount tokens</div>
                        <div style={{ color: 'red', marginLeft: '5px' }}>*</div>
                      </Col>
                      <Col md={{ size: 6, pull: 1 }}>
                        <Input
                          type='number'
                          value={this.state.investorTokensWithBonus}
                          onChange={e => this.setState({ investorTokensWithBonus: e.target.value })}
                          onKeyDown={this.handleSubmit}
                          placeholder='e.g. 100.46'
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
                          placeholder='e.g. 20'
                          className='form-control-sm'
                        />
                      </Col>
                    </Row>
                    <RaisedButton label='Send' primary={true} onClick={() => this.manualSendTokensWithBonus()}/>
                  </Tab>
                </Tabs>
              </MuiThemeProvider>
            </Col>
          </Row>
        </div>
      );
    }
  }

  renderStartNewRound() {
    const { myAddress, owner } = this.state;
    if ( owner.length > 0 && myAddress === owner) {
      return (
        <div>
          <Row className='form-group'>
            <Col md={{ size: 12 }}>
              <label><strong>Start a new round (owner)</strong></label>
            </Col>
            <Col>
              <Input
                type='number'
                value={this.state.newTokenRate}
                onChange={e => this.setState({ newTokenRate: e.target.value })}
                placeholder='Enter new rate (USD)'
                onKeyDown={this.handleSubmit}
              />
            </Col>
            <Col>
              <Input
                readOnly
                value={this.state.newRoundStart.toLocaleString()}
                onFocus={() => this.showDatePicker('round')}
                onChange={e => this.setState({ newRoundStart: e.target.value })}
                onKeyDown={this.handleSubmit}
              />
            </Col>
          </Row>
          <MuiThemeProvider muiTheme={lightMuiTheme}>
            <RaisedButton
              label='Start'
              primary={true}
              disabled={this.state.newRound}
              onClick={() => this.startNewRound()}/>
          </MuiThemeProvider>
        </div>
      )
    }
  }

  renderTransferOwnership() {
    const { myAddress, owner } = this.state;
    if ( owner.length > 0 && myAddress === owner) {
      return (
        <div>
          <Row className='form-group'>
            <Col>
              <label><strong>Transfer ownership (owner)</strong></label>
              <Input
                value={this.state.newOwner}
                onChange={e => this.setState({ newOwner: e.target.value })}
                placeholder='Enter address'
                onKeyDown={this.handleSubmit}
              />
            </Col>
          </Row>
          <MuiThemeProvider muiTheme={lightMuiTheme}>
            <RaisedButton label='Submit' primary={true} onClick={() => this.transferOwnership()}/>
          </MuiThemeProvider>
        </div>
      )
    }
  }

  render() {
    return (
      <div className='App'>
        <Navbar className='myNavbar'>
          <div className='navbar-brand'>Enjoy life token ICO</div>
        </Navbar>
        <div className='myContainer'>
          <Col md={{ size: 8 }}>
            <div className='main-container'>
              <Row className='form-group'>
                <Col>
                  <h4>My information</h4>
                  <hr className='my-2'/>
                  <Row><Col><label>Address</label></Col></Row>
                  <Row className='form-group'>
                    <Col>
                      <Input disabled={true} value={this.state.myAddress}/>
                    </Col>
                  </Row>
                  <Row><Col><label>My investments (not including pre-ICO)</label></Col></Row>
                  <Row className='form-group'>
                    <Col>
                      <Input
                        disabled={true}
                        value={`${this.state.myInvestments} eth`}
                        style={{ textAlign: 'end' }}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 9 }}><label>Tokens bought by me</label></Col>
                    <Col md={{ size: 3 }} style={{ textAlign: 'end' }}>{this.state.myTokens}</Col>
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
                    <Col md={{ size: 8 }}><label>ETH/USD</label></Col>
                    <Col md={{ size: 4 }} style={{ textAlign: 'end' }}>{this.state.usdRate}$</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 8 }}><label>Token rate</label></Col>
                    <Col md={{ size: 4 }} style={{ textAlign: 'end' }}>{this.state.roundRate}$</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 8 }}><label>Minimum investment for pre-ICO</label></Col>
                    <Col md={{ size: 4 }} style={{ textAlign: 'end' }}>{this.state.minInvestmentPreICO}$</Col>
                  </Row>
                  <Row className='form-group'>
                    <Col md={{ size: 8 }}><label>Minimum investment for ICO</label></Col>
                    <Col md={{ size: 4 }} style={{ textAlign: 'end' }}>{this.state.minInvestmentICO}$</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 6 }}><label>Status</label></Col>
                    <Col md={{ size: 6 }} style={{ textAlign: 'end', fontWeight: 'bolder' }}>{this.state.status}</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 8 }}><label>Left tokens in the current round</label></Col>
                    <Col md={{ size: 4 }} style={{ textAlign: 'end', fontWeight: 'bolder' }}>{this.state.roundRemaining}</Col>
                  </Row>
                </Col>
              </Row>
              <Row>
                <Col>
                  <label><strong>Buying tokens</strong></label>
                  <Row>
                    <Col md={{ size: 8 }}>
                      <Input
                        type='number'
                        value={this.state.amount}
                        onChange={e => this.setState({ amount: e.target.value })}
                        placeholder='Enter amount (ETH)'
                        onKeyDown={this.handleSubmit}
                      />
                    </Col>
                    <Col md={{ size: 4 }} style={{ textAlign: 'end' }}>
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <RaisedButton label='Buy' primary={true} onClick={() => this.buyingTokens()}/>
                      </MuiThemeProvider>
                    </Col>
                  </Row>
                </Col>
                <Col>
                  <label><strong>After the completion of the ICO</strong></label>
                  <Row>
                    <Col md={{ size: 4 }}>
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <RaisedButton
                          label='Refund'
                          secondary={true}
                          disabled={this.state.refund}
                          onClick={() => this.refund()}
                          style={{ width: 120 }}
                        />
                      </MuiThemeProvider>
                    </Col>
                    <Col md={{ size: 4 }}>
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <RaisedButton
                          label='Distribute'
                          secondary={true}
                          disabled={this.state.distribute}
                          onClick={() => this.manualDistribute()}
                          style={{ width: 120 }}
                        />
                      </MuiThemeProvider>
                    </Col>
                    <Col md={{ size: 4 }}>
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <RaisedButton
                          label='Burn'
                          secondary={true}
                          disabled={this.state.burn}
                          onClick={() => this.burn()}
                          style={{ width: 120 }}
                        />
                      </MuiThemeProvider>
                    </Col>
                  </Row>
                </Col>
              </Row>
              {this.renderManualSender()}
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
                <Col md={{ size: 5 }}>{new Date(this.state.startPreICO * 1000).toLocaleString()}</Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>Beginning of ICO</label></Col>
                <Col md={{ size: 5 }}>{new Date(this.state.startICO * 1000).toLocaleString()}</Col>
              </Row>
              <Row>
                <Col md={{ size: 7 }}><label>End of ICO</label></Col>
                <Col md={{ size: 5 }}>{new Date(this.state.endICO * 1000).toLocaleString()}</Col>
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
              {this.renderStartNewRound()}
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
              {this.renderTransferOwnership()}
            </div>
          </Col>
        </div>
      </div>
    );
  }
}

export default App
