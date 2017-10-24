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

const timeFormat = 'D.MM.YYYY, HH:mm:ss';

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
      roundRate: 0,
      minInvestmentPreICO: 0,
      minInvestmentICO: 0,
      startPreICO: moment(0),
      startICO: moment(0),

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
      newRoundEnd: new Date(),
      previousRounds: [],

      // Transfer ownership
      newOwner: '',

      // Current round
      currentRound: [],
      roundStart: moment(0),
      roundEnd: moment(0),

      // Other
      numberRounds: 1,
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
        tokenAddress, startPreICO, startICO,
        minInvestmentPreICO, minInvestmentICO,
        minCapICO, burnTime, numberRounds
      ] = await Promise.all([
        instance.token.call(), instance.startPreICO.call(), instance.startICO.call(),
        instance.minInvestmentPreICO.call(), instance.minInvestmentICO.call(),
        instance.minCapICO.call(), instance.burnTime.call(), instance.numberRounds.call()
      ]);

      // Enjoy life token initialization
      const file = require('../build/contracts/EnjoyLifeCoinToken.json');
      const enjoyLifeCoinToken = contract({abi: file.abi});
      enjoyLifeCoinToken.setProvider(web3.currentProvider);
      const instanceToken = enjoyLifeCoinToken.at(tokenAddress);

      const [tokenName, tokenSymbol, decimals, initialSupply] = await Promise.all([
        instanceToken.name.call(), instanceToken.symbol.call(),
        instanceToken.decimals.call(), instanceToken.initialSupply.call()
      ]);
      const decimalsNum = decimals.toNumber();
      const divider = Math.pow(10, decimalsNum);

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
        numberRounds: numberRounds.toNumber(),
        crowdsaleAddress: crowdsale.address,
        startPreICO: moment.unix(startPreICO),
        startICO: moment.unix(startICO),
        minInvestmentPreICO: minInvestmentPreICO.toNumber() / 100,
        minInvestmentICO: minInvestmentICO.toNumber() / 100,
        minCapICO: minCapICO,
        burnTime: burnTime.toNumber()
      });

      this.updateState();
    } catch (error) {
      console.log(error);
    }
  }

  async updateState() {
    const { web3, instanceCrowdsale, instanceToken, divider, minCapICO, burnTime, numberRounds } = this.state;

    // Fields update
    const [
      myTokens, tokensCountPreICO, tokensCountICO,
      numInvestors, currentRound, myInvestments,
      owner, usdRate, unSoldTokens
    ] = await Promise.all([
      instanceToken.balanceOf(web3.eth.accounts[0]), instanceCrowdsale.tokensCountPreICO.call(),
      instanceCrowdsale.tokensCountICO.call(), instanceCrowdsale.getAllInvestors.call(),
      instanceCrowdsale.currentRound.call(), instanceCrowdsale.balancesICO.call(web3.eth.accounts[0]),
      instanceCrowdsale.owner.call(), instanceCrowdsale.currentRateUSD.call(), instanceCrowdsale.getTokens.call()
    ]);
    const roundNumber = currentRound[0].toNumber();

    // Get info about investors
    let investorsTokens = [];
    for (let i = 0; i < numInvestors; i++) {
      const address = await instanceCrowdsale.investors.call(i);
      const tokens = await instanceCrowdsale.investorsTokens.call(address);
      investorsTokens.push({ address: address, tokens: tokens.toNumber() / divider });
    }

    // Сheck the possibility of refund and burn
    //
    // Refund:
    // require(
    //  currentRound.number == numberRounds && now > currentRound.end &&
    //  (tokensCountPreICO + tokensCountICO) < minCapICO
    // );
    //
    // Burn:
    // require(
    //  currentRound.number == numberRounds &&
    //  now > (currentRound.end + burnTime * 1 days) &&
    //  (tokensCountPreICO + tokensCountICO) > minCapICO
    // );
    const refund =
      roundNumber === numberRounds && moment() > moment.unix(currentRound[2]) &&
      (tokensCountPreICO.toNumber() + tokensCountICO.toNumber()) < minCapICO.toNumber();
    const burn =
      roundNumber === numberRounds &&
      moment() > moment.unix(currentRound[2]).add(burnTime, 'days') &&
      (tokensCountPreICO.toNumber() + tokensCountICO.toNumber()) > minCapICO.toNumber();

    // Check the start of a new round (remaining tokens)
    // require(
    //  now > currentRound.end &&
    //  _start > currentRound.end && _start > now &&
    //  _end > _start && _rate > 0 &&
    //  currentRound.number < numberRounds
    // );
    const newRound = moment() > moment.unix(currentRound[2]) && roundNumber < numberRounds;

    // Getting information on previous rounds
    const previousRounds = [];
    for (let i = 0; i < roundNumber - 1; i++) {
       const round = await instanceCrowdsale.rounds.call(i);
       previousRounds.push({
         number: round[0].toNumber(),
         start: moment.unix(round[1]).format('D.MM.YYYY, HH:mm'),
         end: moment.unix(round[2]).format('D.MM.YYYY, HH:mm'),
         rate: `${round[3].toNumber() / 100}$`,
         sold: round[5].toNumber() / divider
       });
    }

    // Check the possibility of distributing tokens after the completion of the ICO
    // require(currentRound.number == numberRounds && now > currentRound.end && (tokensCountPreICO + tokensCountICO) > minCapICO);
    const distribute =
      roundNumber === numberRounds &&
      moment() > moment.unix(currentRound[2]) &&
      (tokensCountPreICO.toNumber() + tokensCountICO.toNumber()) > minCapICO.toNumber();

    this.setState({
      owner: owner,
      usdRate: usdRate.toNumber() / 100,

      // Statistics
      unSoldTokens: unSoldTokens.toNumber() / divider,
      tokensCountPreICO: tokensCountPreICO.toNumber() / divider,
      tokensCountICO: tokensCountICO.toNumber() / divider,
      numInvestors: numInvestors.toNumber(),
      investorsTokens: investorsTokens,

      // My info
      myAddress: web3.eth.accounts[0],
      myTokens: myTokens.toNumber() / divider,
      myInvestments: web3.fromWei(myInvestments.toNumber(), 'ether'),

      // Button status
      refund: refund ? false : true,
      burn: burn ? false : true,
      newRound: newRound ? false : true,
      distribute: distribute ? false : true,

      // Round information
      roundNumber: roundNumber,
      roundStart: moment.unix(currentRound[1]),
      roundEnd: moment.unix(currentRound[2]),
      roundRate: currentRound[3].toNumber() / 100,
      roundRemaining: currentRound[4].toNumber() / divider,
      roundSold: currentRound[5].toNumber() / divider,
      previousRounds: previousRounds
    });

    this.checkStatus();
  }

  checkStatus() { // TODO !!!
    const { startPreICO, startICO, refund, roundNumber, roundStart, roundEnd, numberRounds } = this.state;

    let status = 'Unknown';
    if (moment() < startPreICO) {
      status = 'Waiting for pre-ICO to start';
    } else if (moment() < startICO) {
      status = 'Pre-ICO in progress';
    } else {
      if (moment() < roundStart) {
        status = 'Waiting for the next round';
      } else if (moment() > roundStart && moment() < roundEnd) {
        status = 'ICO in progress';
      } else {
        if (roundNumber === numberRounds) {
          status = refund ? 'ICO completed!' : 'ICO has failed!';
        } else if (roundNumber < numberRounds) {
          status = 'Round is over';
        }
      }
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

    switch (this.state.flag) {
      case 'manual':
        this.setState({ investorTimestamp: time.getTime() });
        break;
      case 'roundStart':
        this.setState({ newRoundStart: time });
        break;
      case 'roundEnd':
        this.setState({ newRoundEnd: time });
        break;
      default:
        console.error('type of setTimePicker');
    }
  }

  buyingTokens() {
    const { web3, amount, crowdsaleAddress } = this.state;
    web3.eth.sendTransaction({
      from: web3.eth.accounts[0],
      to: crowdsaleAddress,
      value: web3.toWei(amount, 'ether'),
      gas: 300000
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

    this.updateState();
  }

  async startNewRound() {
    const { web3, instanceCrowdsale, newTokenRate, newRoundStart, newRoundEnd } = this.state;
    await instanceCrowdsale.startingNewRound(
      newRoundStart.getTime() / 1000, newRoundEnd.getTime() / 1000,
      newTokenRate * 100, { from: web3.eth.accounts[0], gas: 300000 }
    );

    this.updateState();
  }

  async manualSendTokensWithTime() {
    const {
      web3, instanceCrowdsale, investorAddressWithTime,
      investorTokensWithTime, investorTimestamp, divider
    } = this.state;

    await instanceCrowdsale.sendToAddress(
      investorAddressWithTime, investorTokensWithTime * divider, investorTimestamp / 1000,
      { from: web3.eth.accounts[0], gas: 300000 }
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
    await instanceCrowdsale.refund({ from: web3.eth.accounts[0], gas: 100000 });

    console.log('refund');
    this.updateState();
  }

  async burn() {
    const { web3, instanceCrowdsale } = this.state;
    await instanceCrowdsale.burnTokens({ from: web3.eth.accounts[0], gas: 200000 });

    console.log('burn');
    this.updateState();
  }

  async manualDistribute() {
    const { web3, instanceCrowdsale } = this.state;
    await instanceCrowdsale.manualDistribute({ from: web3.eth.accounts[0], gas: 200000 });

    console.log('distribute');
    this.updateState();
  }

  updateEthRate() {
    const { web3, instanceCrowdsale } = this.state;
    instanceCrowdsale.updateEthRate({ from: web3.eth.accounts[0], value: web3.toWei(0.0041065, 'ether') })

    console.log('eth/usd');
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
              <h4>Send tokens manually</h4>
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
                        <div className='mylabel'>Amount of tokens</div>
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
                        <div className='mylabel'>Amount of tokens</div>
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
          <Row>
            <Col md={{ size: 12 }}>
              <label><strong>Start a new round (owner)</strong></label>
            </Col>
            <Col md={{ size: 12 }} className='form-group'>
              <Row>
                <Col className='myLabel'>
                  <label>Rate</label>
                  <div style={{ color: 'red', marginLeft: '5px' }}>*</div>
                </Col>
                <Col>
                  <Input
                    type='number'
                    value={this.state.newTokenRate}
                    onChange={e => this.setState({ newTokenRate: e.target.value })}
                    placeholder='Enter rate (USD)'
                    onKeyDown={this.handleSubmit}
                  />
                </Col>
              </Row>
            </Col>
            <Col md={{ size: 12 }} className='form-group'>
              <Row>
                <Col className='myLabel'>
                  <label>Start</label>
                  <div style={{ color: 'red', marginLeft: '5px' }}>*</div>
                </Col>
                <Col>
                  <Input
                    readOnly
                    value={this.state.newRoundStart.toLocaleString()}
                    onFocus={() => this.showDatePicker('roundStart')}
                    onChange={e => this.setState({ newRoundStart: e.target.value })}
                    onKeyDown={this.handleSubmit}
                  />
                </Col>
              </Row>
            </Col>
            <Col md={{ size: 12 }} className='form-group'>
              <Row>
                <Col className='myLabel'>
                  <label>End</label>
                  <div style={{ color: 'red', marginLeft: '5px' }}>*</div>
                </Col>
                <Col>
                  <Input
                    readOnly
                    value={this.state.newRoundEnd.toLocaleString()}
                    onFocus={() => this.showDatePicker('roundEnd')}
                    onChange={e => this.setState({ newRoundEnd: e.target.value })}
                    onKeyDown={this.handleSubmit}
                  />
                </Col>
              </Row>
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
                </Col>
              </Row>
              <Row className='form-group'>
                <Col>
                  <Row>
                    <Col md={{ size: 4 }}><label>Status ICO</label></Col>
                    <Col md={{ size: 8 }} style={{ textAlign: 'end', fontWeight: 'bolder' }}>{this.state.status}</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 8 }}><label>Remaining tokens</label></Col>
                    <Col md={{ size: 4 }} style={{ textAlign: 'end', fontWeight: 'bolder' }}>{this.state.roundRemaining}</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 9 }}><label>Tokens bought by me</label></Col>
                    <Col md={{ size: 3 }} style={{ textAlign: 'end' }}>{this.state.myTokens}</Col>
                  </Row>
                </Col>
                <Col>
                  <Row>
                    <Col>
                      <label><strong>Update ETH/USD rate</strong></label>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 4 }}>
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <RaisedButton
                          label='Oraclize'
                          primary={true}
                          onClick={() => this.updateEthRate()}
                          style={{ width: 120 }}
                        />
                      </MuiThemeProvider>
                    </Col>
                    <Col md={{ size: 8 }} style={{ fontStyle: 'italic', textAlign: 'center' }}>* for each course request 0.0041065 eth</Col>
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
                    <Col style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <RaisedButton
                          label='Refund'
                          secondary={true}
                          disabled={this.state.refund}
                          onClick={() => this.refund()}
                          style={{ width: 120 }}
                        />
                      </MuiThemeProvider>
                      <MuiThemeProvider muiTheme={lightMuiTheme}>
                        <RaisedButton
                          label='Distribute'
                          secondary={true}
                          disabled={this.state.distribute}
                          onClick={() => this.manualDistribute()}
                          style={{ width: 120 }}
                        />
                      </MuiThemeProvider>
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
                    <Col>
                      <Row>
                        <Col><label>Number of unsold tokens</label></Col>
                        <Col className='displayValue'>{this.state.unSoldTokens}</Col>
                      </Row>
                      <Row>
                        <Col><label>Number of tokens sold at pre-ICO</label></Col>
                        <Col className='displayValue'>{this.state.tokensCountPreICO}</Col>
                      </Row>
                      <Row>
                        <Col><label>Number of tokens sold at ICO</label></Col>
                        <Col className='displayValue'>{this.state.tokensCountICO}</Col>
                      </Row>
                      <Row>
                        <Col><label>Investors Count</label></Col>
                        <Col className='displayValue'>{this.state.numInvestors}</Col>
                      </Row>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <h4>Previous rounds</h4>
                      <hr className='my-2'/>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <BootstrapTable data={this.state.previousRounds} version='4' striped={true} hover={true}>
                        <TableHeaderColumn dataField='number' isKey={true}>Number</TableHeaderColumn>
                        <TableHeaderColumn dataField='rate'>Rate</TableHeaderColumn>
                        <TableHeaderColumn dataField='sold'>Sold</TableHeaderColumn>
                        <TableHeaderColumn dataField='start'>Start</TableHeaderColumn>
                        <TableHeaderColumn dataField='end'>End</TableHeaderColumn>
                      </BootstrapTable>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <h4>Investors</h4>
                      <hr className='my-2'/>
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
                <Col><label>Name</label></Col>
                <Col className='displayValue'>{this.state.tokenName}</Col>
              </Row>
              <Row>
                <Col><label>Symbol</label></Col>
                <Col className='displayValue'>{this.state.tokenSymbol}</Col>
              </Row>
              <Row>
                <Col><label>Decimals</label></Col>
                <Col className='displayValue'>{this.state.decimals}</Col>
              </Row>
              <Row>
                <Col><label>Initial supply</label></Col>
                <Col className='displayValue'>{this.state.initialSupply}</Col>
              </Row>
              <Row>
                <Col>
                  <h5>Crowdsale info</h5>
                  <hr className='my-2'/>
                </Col>
              </Row>
              <Row>
                <Col className='myLabel'><label>Beginning of pre-ICO</label></Col>
                <Col className='displayValue'>{this.state.startPreICO.format(timeFormat)}</Col>
              </Row>
              <Row>
                <Col className='myLabel'><label>Beginning of ICO</label></Col>
                <Col className='displayValue'>{this.state.startICO.format(timeFormat)}</Col>
              </Row>
              <Row>
                <Col>
                  <h5>Round info</h5>
                  <hr className='my-2'/>
                </Col>
              </Row>
              <Row>
                <Col className='myLabel'><label>Current round</label></Col>
                <Col className='displayValue'>{this.state.roundNumber}</Col>
              </Row>
              <Row>
                <Col className='myLabel'><label>Beginning of the round</label></Col>
                <Col className='displayValue'>{this.state.roundStart.format(timeFormat)}</Col>
              </Row>
              <Row>
                <Col className='myLabel'><label>End of the round</label></Col>
                <Col className='displayValue'>{this.state.roundEnd.format(timeFormat)}</Col>
              </Row>
              <Row>
                <Col className='myLabel'><label>Sold tokens</label></Col>
                <Col className='displayValue'>{this.state.roundSold}</Col>
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
