import {Button, Card, Col, DatePicker, Divider, Empty, Input, Progress, Row, Slider, Spin, Switch, Table} from "antd";
import React, { useCallback, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useContractReader } from "eth-hooks";
import Meta from "antd/es/card/Meta";
import Identicon from "react-identicons";

export default function IndexAuction({
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
  const history = useHistory();
  const handleOnClick = useCallback(address => history.push(`/auction/show/${address}`), [history]);
  const _auctions = useContractReader(readContracts, "AuctionFactory", "getAllAuctions", []);
  console.log("auction is : ", _auctions);
  return (
    <div>
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 1200, margin: "auto", marginTop: 64 }}>
        {(_auctions === undefined || _auctions.length === 0) && <Empty description="No Auctions"/>}
        <Row gutter={24}>
          {_auctions !== undefined &&
            _auctions.map((el, i) => (
              <Col span={6} key={el}>
                <Card
                  hoverable
                  onClick={() => handleOnClick(el)}
                  style={{
                    width: 240,
                    marginTop: 32,
                  }}
                  cover={<Identicon string={el} size={240} />}
                >
                  <Meta title={`Auction Number #${i + 1}`} description={`Contract Address ${el}`} />
                </Card>
              </Col>
            ))}
        </Row>
      </div>
    </div>
  );
}
