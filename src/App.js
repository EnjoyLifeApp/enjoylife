import React, { Component } from 'react'
import CrowdsaleContract from '../build/contracts/Crowdsale.json';
import getWeb3 from './utils/getWeb3';

import 'react-bootstrap-table/dist/react-bootstrap-table.min.css'
import 'bootstrap/dist/css/bootstrap.css';
import './css/App.css'

import { Navbar, Row, Col, Button, Input } from 'reactstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

const contract = require('truffle-contract');

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      myTokens: 0,
      investors: [
        { address: '0xc17c953a066a02c753687c1527eaa9b067a6f762', tokens: 1000 },
        { address: '0x4d0d10f132b7c4493c504eccb4527c0321715e8a', tokens: 3000 }
      ]
    }
  }

  async componentWillMount() {
    try {
      const web3 = (await getWeb3).web3;
      const crowdsale = contract(CrowdsaleContract);

      // Crowdsale initialization
      crowdsale.setProvider(web3.currentProvider);
      const instance = await crowdsale.deployed();
      const [owner, tokenAddress, startPreICO, startICO, endICO] = await Promise.all([
        instance.owner.call(), instance.token.call(), instance.startPreICO.call(),
        instance.startICO.call(), instance.endICO.call()
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
        initialSupply: initialSupply.toNumber() / Math.pow(10, decimalsNum),

        // Information on the crowdsale
        crowdsaleAddress: crowdsale.address,
        owner: owner,
        startPreICO: new Date(startPreICO * 1000).toLocaleString(),
        startICO: new Date(startICO * 1000).toLocaleString(),
        endICO: new Date(endICO * 1000).toLocaleString()
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
      <div className='App'>
        <Navbar className='myNavbar'>
          <div className='navbar-brand'>Enjoy life token ICO</div>
        </Navbar>
        <Row>
          <Col md={{ size: 8 }}>
            <div className='main-container'>
              <Row>
                <Col>
                  <h4>My tokens</h4>
                  <hr className='my-2'/>
                  <Row>
                    <Col><label>Balance</label></Col>
                    <Col>{this.state.myTokens}</Col>
                  </Row>
                  <label><strong>Buying tokens</strong></label>
                  <Row>
                    <Col>
                      <Input
                        placeholder='Enter amount'
                      />
                    </Col>
                    <Col>
                      <Button color='info'>Buy</Button>
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
                    <Col md={{ size: 2 }}>{this.state.usdRate}</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 10 }}><label>Token rate</label></Col>
                    <Col md={{ size: 2 }}>{this.state.tokenRate}</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 10 }}><label>Minimum investment for pre-ICO</label></Col>
                    <Col md={{ size: 2 }}>{this.state.minInvestmentPreICO}</Col>
                  </Row>
                  <Row>
                    <Col md={{ size: 10 }}><label>Minimum investment for ICO</label></Col>
                    <Col md={{ size: 2 }}>{this.state.minInvestmentICO}</Col>
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
                    <Col md={{ size: 6, pull: 1 }}>(Time picker)</Col>
                  </Row>
                  <Button color='info'>Send</Button>
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
                    <Col md={{ size: 6 }}>
                      <Row>
                        <Col><label>Sold tokens</label></Col>
                        <Col>0</Col>
                      </Row>
                      <Row>
                        <Col><label>Total amount</label></Col>
                        <Col>0</Col>
                      </Row>
                      <Row>
                        <Col><label>Left tokens by round</label></Col>
                        <Col>0</Col>
                      </Row>
                      <Row>
                        <Col><label>Investors Count</label></Col>
                        <Col>0</Col>
                      </Row>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <BootstrapTable data={this.state.investors} version='4' striped={true} hover={true}>
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
                <Col>{this.state.tokenName}</Col>
              </Row>
              <Row>
                <Col><label>Symbol</label></Col>
                <Col>{this.state.tokenSymbol}</Col>
              </Row>
              <Row>
                <Col><label>Decimals</label></Col>
                <Col>{this.state.decimals}</Col>
              </Row>
              <Row>
                <Col><label>Initial supply</label></Col>
                <Col>{this.state.initialSupply}</Col>
              </Row>
              <Row>
                <Col>
                  <h5>Crowdsale info</h5>
                  <hr className='my-2'/>
                </Col>
              </Row>
              <Row>
                <Col><label>Beginning of pre-ICO</label></Col>
                <Col>{this.state.startPreICO}</Col>
              </Row>
              <Row>
                <Col><label>Beginning of ICO</label></Col>
                <Col>{this.state.startICO}</Col>
              </Row>
              <Row>
                <Col><label>End of ICO</label></Col>
                <Col>{this.state.endICO}</Col>
              </Row>
              <Row>
                <Col><label>Number of the current round</label></Col>
                <Col>0</Col>
              </Row>
              <Row className='form-group'>
                <Col md={{ size: 12 }}>
                  <label><strong>Start a new round (owner)</strong></label>
                </Col>
                <Col md={{ size: 6 }}>
                  <Input
                    type='number'
                    value={this.state.tokenRate}
                    onChange={e => this.setState({ tokenRate: e.target.value })}
                    placeholder='Enter your new rate'
                    onKeyDown={this.handleSubmit}
                  />
                </Col>
                <Col md={{ size: 6 }}>
                  <Input
                    type='number'
                    value={this.state.tokenRate}
                    onChange={e => this.setState({ tokenRate: e.target.value })}
                    placeholder='Time picker'
                    onKeyDown={this.handleSubmit}
                  />
                </Col>
              </Row>
              <Button color='info'>Start</Button>
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
              <Button color='info'>Submit</Button>
            </div>
          </Col>
        </Row>
      </div>
    );
  }
}

export default App
