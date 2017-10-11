import React, { Component } from 'react'
import CrowdsaleContract from '../build/contracts/Crowdsale.json';
import getWeb3 from './utils/getWeb3';

import 'bootstrap/dist/css/bootstrap.css';
import './css/App.css'

import { Button, Input, Container, Row, Col } from 'reactstrap';

const contract = require('truffle-contract');

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      instance: 0
    }
  }

  async componentWillMount() {
    try {
      const web3 = (await getWeb3).web3;
      const crowdsale = contract(CrowdsaleContract);

      // Crowdsale initialization
      crowdsale.setProvider(web3.currentProvider);
      const instance = await crowdsale.deployed();

      // Enjoy life token initialization
      const file = require('../build/contracts/EnjoyLifeCoinToken.json');
      const enjoyLifeCoinToken = contract({abi: file.abi});
      enjoyLifeCoinToken.setProvider(web3.currentProvider);
      const instanceToken = enjoyLifeCoinToken.at(await instance.token());

      const [name, symbol, decimals, initialSupply] = await Promise.all([
        instanceToken.name.call(), instanceToken.symbol.call(),
        instanceToken.decimals.call(), instanceToken.initialSupply.call()
      ]);
      const startPreICO = await instance.startPreICO();
      const decimalsNum = decimals.toNumber()

      this.setState({
        // Information on contracts
        web3: web3,
        instanceCrowdsale: instance,
        instanceToken: instanceToken,

        // Information on the token
        name: name,
        symbol: symbol,
        decimals: decimalsNum,
        initialSupply: initialSupply.toNumber() / Math.pow(10, decimalsNum),

        // Information on the crowdsale
        startPreICO: startPreICO.toString()
      });
      this.instantiateContract();
    } catch (error) {
      console.log(error);
    }
  }

  instantiateContract() {
  }

  render() {
    return (
      <Container>
        <Row>
          <Col md={{ size: '6' }}>
            <h3>{this.state.name}</h3>
            <div>Symbol: {this.state.symbol}</div>
            <div>Decimals: {this.state.decimals}</div>
            <div>Initial supply: {this.state.initialSupply}</div>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default App
