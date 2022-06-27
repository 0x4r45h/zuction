import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Statistic,
  Upload,
  message,
  Progress,
  InputNumber,
  Tabs,
  Table,
} from "antd";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useContractLoader, useContractReader } from "eth-hooks";
import { Keypair, PubKey, PrivKey } from "maci-domainobjs";
import { sign, encrypt, decrypt } from "maci-crypto";
import { exportSolidityCallData, fullProve } from "snarkjs/src/groth16";
import JSZip from "jszip";
import { UploadOutlined } from "@ant-design/icons";
const { TabPane } = Tabs;

const circuitWasm = `${process.env.PUBLIC_URL}/LessThanWinner.wasm`;
const circuitZk = `${process.env.PUBLIC_URL}/circuit_final.zkey`;

export default function ShowAuction({
  purpose,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
  contractConfig,
  userSigner,
  localChainId,
}) {
  let { addressParam } = useParams();

  const [proofFile, setProofFile] = useState(new File([], ""));
  const [challengeProofFile, setChallengeProofFile] = useState(new File([], ""));
  const [uploading, setUploading] = useState(false);
  const customConfig = { ...contractConfig, ...{ customAddresses: { Auction: addressParam } } };
  const rc = useContractLoader(localProvider, customConfig);
  const wc = useContractLoader(userSigner, customConfig, localChainId);
  const _pubKey = useContractReader(rc, "Auction", "auctioneerPubkey", []);
  const _state = useContractReader(rc, "Auction", "state", []);
  const _auctioneerAddr = useContractReader(rc, "Auction", "auctioneer", []);
  const _biddingEnd = useContractReader(rc, "Auction", "biddingEnd", []);
  const _challengeDuration = useContractReader(rc, "Auction", "challengeDuration", []);
  const _challengeEnd = useContractReader(rc, "Auction", "challengeEnd", []);
  const _bidsCount = useContractReader(rc, "Auction", "bidsCount", []);
  // const _commitments = useContractReader(rc, "Auction", "commitments", []); // this requires an address as input
  const _winner = useContractReader(rc, "Auction", "winner", []);
  const _allBidCommitments = useContractReader(rc, "Auction", "getBids", []);
  const { Countdown } = Statistic;
  const [placeBidForm] = Form.useForm();
  const [setWinnerForm] = Form.useForm();
  const [auctioneerPrivateKey, setAuctioneerPrivateKey] = useState(new PrivKey(BigInt(0)));
  const [decryptedBids, setDecryptedBids] = useState(new Map());
  const [allCommitments, setAllCommitments] = useState(new Map());
  const [allProofs, setAllProofs] = useState(new Map());
  const [greaterThanWinnerAddr, setGreaterThanWinnerAddr] = useState("");
  const [percent, setPercent] = useState(0);
  const [generatingProof, setGeneratingProof] = useState(false);

  useEffect(() => {
    if (_allBidCommitments !== undefined && auctioneerPrivateKey.rawPrivKey.toString() !== "0") {
      openBids();
    }
  }, [auctioneerPrivateKey, allCommitments]);
  useEffect(() => {
    const all = new Map();
    if (_allBidCommitments !== undefined) {
      _allBidCommitments.forEach(item => {
        all.set(item.addr, {
          pubKey: item.pubKey.map(item => item.toString()),
          encrypted: item.encrypted.map(item => item.toString()),
          signature: item.signature.map(item => item.toString()),
        });
      });
      setAllCommitments(all);
    }
  }, [_allBidCommitments]);

  const handleUpload = async () => {
    try {
      setUploading(true);
      const proof = await new Response(proofFile).json();
      // const result = rc.Auction.verifyProof(JSON.parse(proof.a), JSON.parse(proof.b), JSON.parse(proof.c), JSON.parse(proof.input))
      const result = await rc.Auction.verifyProof(proof.a, proof.b, proof.c, proof.input);
      console.log("awaiting metamask/web3 confirm result...", result);
      console.log("result is ", result);
      result.valueOf() === true ? message.success("Proof is valid") : message.error("Proof is invalid");
    } catch (e) {
      message.error("Error, see console for details");
      console.log("Upload failed : ", e);
    }
    setUploading(false);
  };
  const handleChallengeUpload = async () => {
    try {
      setUploading(true);

      const proof = await new Response(challengeProofFile).json();
      const result = tx(
        wc.Auction.challengeWinner(greaterThanWinnerAddr, proof.a, proof.b, proof.c, proof.input),
        update => {
          console.log("📡 Transaction Update:", update);
          if (update && (update.status === "confirmed" || update.status === 1)) {
            console.log(" 🍾 Transaction " + update.hash + " finished!");
          }
        },
      );
      console.log("awaiting metamask/web3 confirm result...", result);
      console.log("result is ", await result);
      message.success("You claim is right. the whole auction is now invalidated");
    } catch (e) {
      message.error("Error, see console for details");
      console.log("Upload challenge failed : ", e);
    }
    setUploading(false);
  };

  const placeBid = async values => {
    const userKeyPair = new Keypair();
    const sharedKey = Keypair.genEcdhSharedKey(
      userKeyPair.privKey,
      new PubKey([_pubKey[0].toBigInt(), _pubKey[1].toBigInt()]),
    );
    const bidValue = BigInt(values.bid);
    const signature = sign(userKeyPair.privKey.rawPrivKey, bidValue);
    const encryptedBid = encrypt([bidValue], sharedKey);
    console.log(signature);
    console.log(encryptedBid);
    const result = tx(
      wc.Auction.bid(
        userKeyPair.pubKey.rawPubKey[0].toString(),
        userKeyPair.pubKey.rawPubKey[1].toString(),
        [encryptedBid.iv.toString(), ...encryptedBid.data.map(n => n.toString())],
        [...signature.R8.map(n => n.toString()), signature.S.toString()],
      ),
      update => {
        console.log("📡 Transaction Update:", update);
        if (update && (update.status === "confirmed" || update.status === 1)) {
          console.log(" 🍾 Transaction " + update.hash + " finished!");
        }
      },
    );
    console.log("awaiting metamask/web3 confirm result...", result);
    console.log(await result);
  };
  const setWinner = async values => {
    tx(wc.Auction.announceWinner(values.winnerAddr));
  };
  const finalize = async () => {
    tx(wc.Auction.finalizeAuction());
  };

  const openBids = () => {
    if (auctioneerPrivateKey.rawPrivKey.toString() === "0") {
      // alert("Please enter Auctioneer private key");
      console.log("Please enter Auctioneer private key");
      return;
    }
    const bids = new Map();
    allCommitments.forEach((v, k) => {
      const sharedKey = Keypair.genEcdhSharedKey(
        auctioneerPrivateKey,
        new PubKey([BigInt(v.pubKey[0]), BigInt(v.pubKey[1])]),
      );
      const plainBid = decrypt(
        {
          iv: BigInt(v.encrypted[0]),
          data: v.encrypted.slice(1).map(item => BigInt(item)),
        },
        sharedKey,
      );
      bids.set(k, plainBid);
    });
    const sortedBids = new Map([...bids.entries()].sort((a, b) => b[1] - a[1]));
    setDecryptedBids(sortedBids);
    return sortedBids;
  };
  const getCommitments = async () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(Object.fromEntries(allCommitments)),
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "commitments.json";
    link.click();
  };

  const computeState = value => {
    if (value === 0) {
      return "Live";
    } else if (value === 1) {
      return "Challenge";
    } else if (value === 2) {
      return "Complete";
    } else if (value === 3) {
      return "Invalid";
    }
  };

  const generateProof = async () => {
    const decryptedBids = openBids();
    if (decryptedBids === undefined || decryptedBids.size < 2) {
      return;
    }
    setGeneratingProof(true);
    setPercent(1);
    setAllProofs(new Map());
    let currentPercent = 1;
    const percentPerProof = 100 / (decryptedBids.size - 1);
    const keys = Array.from(decryptedBids.keys());
    const winningAddress = keys[0];
    const winningCommitment = allCommitments.get(winningAddress);
    const sharedKeyWinner = Keypair.genEcdhSharedKey(
      auctioneerPrivateKey,
      new PubKey([BigInt(winningCommitment.pubKey[0]), BigInt(winningCommitment.pubKey[1])]),
    ).toString();
    const allInputs = new Map();
    allCommitments.forEach((v, k) => {
      if (k === winningAddress) {
        return;
      }
      allInputs.set(k, {
        shared_keys: [
          sharedKeyWinner,
          Keypair.genEcdhSharedKey(
            auctioneerPrivateKey,
            new PubKey([BigInt(v.pubKey[0]), BigInt(v.pubKey[1])]),
          ).toString(),
        ],
        pub_keys: [winningCommitment.pubKey, v.pubKey],
        signatures: [winningCommitment.signature, v.signature],
        commitments: [winningCommitment.encrypted, v.encrypted],
      });
    });
    console.log("generating proof...");
    for (let [k, input] of allInputs) {
      const { proof, publicSignals } = await fullProve(input, circuitWasm, circuitZk);
      const callData = await exportSolidityCallData(proof, publicSignals);
      const callDataJson = () => {
        const wrapCallDataRaw = JSON.parse(`[${callData}]`);
        return {
          a: wrapCallDataRaw[0].map(v => BigInt(v).toString()),
          b: wrapCallDataRaw[1].map(v => v.map(vv => BigInt(vv).toString())),
          c: wrapCallDataRaw[2].map(v => BigInt(v).toString()),
          input: wrapCallDataRaw[3].map(v => BigInt(v).toString()),
        };
      };
      const zip = new JSZip();
      zip.file("proof.json", JSON.stringify(proof));
      zip.file("publicSignals.json", JSON.stringify(publicSignals));
      zip.file("solidityCallData.json", JSON.stringify(callDataJson()));
      const blob = await zip.generateAsync({ type: "blob" });
      setAllProofs(prev => new Map(prev).set(k, blob));
      setPercent(Math.floor((currentPercent += percentPerProof)));
      console.log("progress is : ", currentPercent);
    }
    setGeneratingProof(false);
  };
  return (
    <div style={{ paddingBottom: 256 }}>
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 1100, margin: "auto", marginTop: 64 }}>
        <h2>Show Auction</h2>
        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <span>Auctioneer Address</span>
          </Col>
          <Col span={8}>
            <span>{_auctioneerAddr ?? ""}</span>
          </Col>
        </Row>
        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <span>Auctioneer PubKeyX</span>
          </Col>
          <Col span={8}>
            <span>{_pubKey?.[0]?.toString() ?? ""}</span>
          </Col>
        </Row>
        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <span>Auctioneer PubKeyY</span>
          </Col>
          <Col span={8}>
            <span>{_pubKey?.[1]?.toString() ?? ""}</span>
          </Col>
        </Row>
        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <span>Auction State</span>
          </Col>
          <Col span={8}>
            <span>{_state !== undefined ? computeState(_state) : ""}</span>
          </Col>
        </Row>
        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <span>Winner Address</span>
          </Col>
          <Col span={8}>
            <span>{_winner ?? "-"}</span>
          </Col>
        </Row>
        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <span>Bid Remaining Time</span>
          </Col>
          <Col span={8}>{_biddingEnd !== undefined && <Countdown value={_biddingEnd.toNumber() * 1000} />}</Col>
        </Row>
        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <span>Challenge Duration (in millisecond)</span>
          </Col>
          <Col span={8}>
            <span>{_challengeDuration !== undefined ? _challengeDuration.toNumber() * 1000 : ""}</span>
          </Col>
        </Row>
        <Divider />
        {_state === 1 && (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <span>Challenge End</span>
              </Col>
              <Col span={8}>{_challengeEnd !== undefined && <Countdown value={_challengeEnd.toNumber() * 1000} />}</Col>
            </Row>
            <Divider />
          </>
        )}

        <Row gutter={16}>
          <Col span={8}>
            <span>Get all commitments</span>
          </Col>
          <Col span={8}>
            <Button onClick={getCommitments}> Get </Button>
          </Col>
        </Row>
        <Divider />

        <Row gutter={16}>
          <Col span={8}>
            <span>Total Bids</span>
          </Col>
          <Col span={8}>
            <span>{_bidsCount?.toNumber() ?? ""}</span>
          </Col>
        </Row>
        <Divider />

        {_state === 1 && (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <span>Finalize the Auction</span>
              </Col>
              <Col span={8}>
                <Button onClick={finalize}> Finalize </Button>
              </Col>
            </Row>
            <Divider />
          </>
        )}
      </div>

      <div
        style={{
          border: "1px solid #cccccc",
          padding: 16,
          width: 1100,
          margin: "auto",
          marginTop: 64,
          direction: "ltr",
        }}
      >
        <h2>Make a Bid</h2>
        <Form
          style={{ justifyContent: "center" }}
          layout="inline"
          name="place-bid"
          form={placeBidForm}
          onFinish={placeBid}
          autoComplete="off"
        >
          <Form.Item
            label="Bid value"
            name="bid"
            rules={[
              { required: true, message: "Please input your bid value!" },
              { type: "integer", min: 1, max: 65000 },
            ]}
          >
            <InputNumber />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </div>
      <div
        style={{
          border: "1px solid #cccccc",
          padding: 16,
          width: 1100,
          margin: "auto",
          marginTop: 64,
          direction: "ltr",
        }}
      >
        <h2>Verify Proof By Contract</h2>
        <Upload
          accept=".json"
          onRemove={() => {
            setProofFile(new File([], ""));
          }}
          beforeUpload={file => {
            setProofFile(file);
            return false;
          }}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
        <Button
          type="primary"
          onClick={handleUpload}
          disabled={proofFile.name === ""}
          loading={uploading}
          style={{
            marginTop: 16,
          }}
        >
          {uploading ? "Uploading" : "Start Upload"}
        </Button>
      </div>
      <div
        style={{
          border: "1px solid #cccccc",
          padding: 16,
          width: 1100,
          margin: "auto",
          marginTop: 64,
          direction: "ltr",
        }}
      >
        <h2>Challenge Winner</h2>
        <Input
          placeholder={"Greater than current winner address"}
          onChange={async e => {
            setGreaterThanWinnerAddr(e.target.value);
          }}
        />
        <Upload
          accept="json"
          onRemove={() => {
            setChallengeProofFile(new File([], ""));
          }}
          beforeUpload={file => {
            setChallengeProofFile(file);
            return false;
          }}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
        <Button
          type="primary"
          onClick={handleChallengeUpload}
          disabled={challengeProofFile.name === "" || greaterThanWinnerAddr === ""}
          loading={uploading}
          style={{
            marginTop: 16,
          }}
        >
          {uploading ? "Uploading" : "Start Upload"}
        </Button>
      </div>

      {/*Only Auctioneer*/}
      {address === _auctioneerAddr && (
        <div
          style={{
            border: "1px solid #cccccc",
            padding: 16,
            width: 1100,
            margin: "auto",
            marginTop: 64,
            marginBottom: 128,
            direction: "ltr",
          }}
        >
          <h1>Auctioneer section</h1>
          <Divider />
          <Row>
            <Col span={12}>Input Auctioneers private key to proceed</Col>
            <Col span={12}>
              <Input
                placeholder={"Auctioneer private key"}
                onChange={async e => {
                  try {
                    setAuctioneerPrivateKey(new PrivKey(BigInt(e.target.value)));
                  } catch (e) {
                    message.error("Invalid Private Key");
                  }
                  console.log(auctioneerPrivateKey);
                }}
              />
            </Col>
          </Row>
          <Divider />
          <Divider />
          <Tabs defaultActiveKey="1" tabPosition="left">
            <TabPane tab="Open Bids" key="1">
              <Table
                columns={[
                  {
                    title: "Address",
                    dataIndex: "address",
                    key: "address",
                  },
                  {
                    title: "Bid Amount",
                    dataIndex: "bid",
                    key: "bid",
                  },
                ]}
                dataSource={[...decryptedBids.entries()].map((v, i) => ({
                  key: i,
                  address: v[0],
                  bid: v[1].toString(),
                }))}
              />
            </TabPane>
            <TabPane disabled={decryptedBids.size === 0} tab="Generate Proofs" key="2">
              <Row gutter={24}>
                <Col span={24}>
                  <Row>
                    <Col span={12} style={{ textAlign: "left" }}>
                      <Button onClick={generateProof} disabled={generatingProof}>
                        Generate Proofs
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Progress percent={percent} />
                    </Col>
                  </Row>
                </Col>
                <Divider />
                <Col span={24}>
                  <Table
                    columns={[
                      {
                        title: "Proof Zip File Per Losing Address",
                        dataIndex: "proof",
                        key: "proof",
                        render: item => (
                          <a href={item.href} download={item.download}>
                            {item.text}
                          </a>
                        ),
                      },
                    ]}
                    dataSource={[...allProofs.entries()].map((v, i) => ({
                      key: i,
                      proof: {
                        href: window.URL.createObjectURL(v[1]),
                        download: `${v[0]}.zip`,
                        text: `${v[0]}.zip`,
                      },
                    }))}
                  />
                </Col>
              </Row>
            </TabPane>
            <TabPane disabled={allProofs.size === 0} tab="Set Winner" key="3">
              <h2>Set Winner</h2>
              <Row gutter={16}>
                <Col span={16}>
                  <Form layout="inline" name="set-winner" form={setWinnerForm} onFinish={setWinner} autoComplete="off">
                    <Form.Item
                      label="Winner Address"
                      name="winnerAddr"
                      rules={[{ required: true, message: "Please input winners address!" }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit">
                        Submit
                      </Button>
                    </Form.Item>
                  </Form>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </div>
      )}
    </div>
  );
}
