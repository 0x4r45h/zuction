import { Button, Form, Input, message } from "antd";
import React from "react";
import { Keypair } from "maci-domainobjs";

export default function CreateAuction({
  purpose,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const downloadKeyPair = keyPair => {
    const keypairObject = {
      pubKey: [keyPair.pubKey.rawPubKey[0].toString(), keyPair.pubKey.rawPubKey[1].toString()],
      prvKey: keyPair.privKey.rawPrivKey.toString(),
    };
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(keypairObject))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "keypair.json";
    link.click();
  };
  const onFinish = async values => {
    const auctioneerKeyPair = new Keypair();

    const result = tx(
      writeContracts.AuctionFactory.createAuctionProxy(
        auctioneerKeyPair.pubKey.rawPubKey[0].toString(),
        auctioneerKeyPair.pubKey.rawPubKey[1].toString(),
        values.bidding_period,
        values.challenge_period,
      ),
      update => {
        if (update instanceof Error) {
          message.error("Error");
        } else {
          console.log("📡 Transaction Update:", update);
          if (update && (update.status === "confirmed" || update.status === 1)) {
            message.success("Auction Created");
            console.log(" 🍾 Transaction " + update.hash + " finished!");
            console.log(
              " ⛽️ " +
                update.gasUsed +
                "/" +
                (update.gasLimit || update.gas) +
                " @ " +
                parseFloat(update.gasPrice) / 1000000000 +
                " gwei",
            );
          }
          downloadKeyPair(auctioneerKeyPair);
        }
      },
    );

    console.log("awaiting metamask/web3 confirm result...", await result);
  };
  return (
    <div>
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 600, margin: "auto", marginTop: 64 }}>
        <h2>Create Auction:</h2>
        <Form
          name="create-auction"
          labelCol={{
            span: 8,
          }}
          wrapperCol={{
            span: 16,
          }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Bidding Duration"
            name="bidding_period"
            rules={[
              {
                required: true,
                message: "Please input Bidding Duration in Second",
              },
              {
                message: "Only numbers are allowed",
                pattern: new RegExp(/^[0-9]+$/),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Challenge Duration"
            name="challenge_period"
            rules={[
              {
                required: true,
                message: "Please input Challenge Duration in Second",
              },
              {
                message: "Only numbers are allowed",
                pattern: new RegExp(/^[0-9]+$/),
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            wrapperCol={{
              offset: 8,
              span: 16,
            }}
          >
            <Button type="primary" htmlType="submit">
              Create
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
