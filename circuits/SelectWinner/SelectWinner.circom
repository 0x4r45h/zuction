pragma circom 2.0.0;

include "./decrypt.circom";
include "../../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/mux1.circom";

// each commitment is
// [0] iv
// [1] actual bid
// [2] // sig R8x
// [3] // sig R8y
// [4] // S
template SelectWinner(n) {
    signal input shared_keys[n];
    signal input addresses[n];
    // commitment[0] is winner and [1] is loser
    signal input commitments[n][5];
    // pub_keys[0] is winner and [1] is loser
    signal input pub_keys[n][2];

    signal output winner;

    // Decrypt message
    component decrypted_command[n];
    component less_than[n];
    component bid_selector[n];
    component address_selector[n];
    for (var i = 0; i <n; i++) {
        decrypted_command[i] =  Decrypt(4);
        decrypted_command[i].private_key <== shared_keys[i];
        decrypted_command[i].message[0] <== commitments[i][0]; // iv
        decrypted_command[i].message[1] <== commitments[i][1]; // actual bid
        decrypted_command[i].message[2] <== commitments[i][2]; // sig R8x
        decrypted_command[i].message[3] <== commitments[i][3]; // sig R8y
        decrypted_command[i].message[4] <== commitments[i][4]; // S

        // log(decrypted_command[i].out[0]);

        less_than[i] =  LessThan(16); // assuming max bid is 65545
        bid_selector[i] =  Mux1();
        bid_selector[i].c[0] <== i == 0 ? 0 : bid_selector[i - 1].out; //biggest value so far
        bid_selector[i].c[1] <== decrypted_command[i].out[0]; //current value

        less_than[i].in[0] <== i == 0 ? 0 : bid_selector[i - 1].out; //previous value
        less_than[i].in[1] <== decrypted_command[i].out[0]; //current value
        // does previous item is less than current item?
        // if yes , then replace the current with previous
        bid_selector[i].s <== less_than[i].out;
        log(bid_selector[i].out);

        address_selector[i] =  Mux1();
        address_selector[i].c[0] <== i == 0 ? addresses[i] : address_selector[i - 1].out; //biggest address so far
        address_selector[i].c[1] <== addresses[i]; //current value
        address_selector[i].s <== less_than[i].out;
        log(address_selector[i].out);


    }
    // Verify signature against user public key, note that signature must be valid or this will panic
    component signature_verifier[n];
    for (var i = 0; i <n; i++) {
        signature_verifier[i] = EdDSAPoseidonVerifier();
        signature_verifier[i].enabled <== 1; // i think this cause panic if signature is not valid
        signature_verifier[i].M <== decrypted_command[i].out[0]; // Plain message
        signature_verifier[i].R8x <== decrypted_command[i].out[1]; // sig R8x
        signature_verifier[i].R8y <== decrypted_command[i].out[2]; // sig R8y
        signature_verifier[i].S <== decrypted_command[i].out[3]; // sig S
        signature_verifier[i].Ax <== pub_keys[i][0]; // public key x
        signature_verifier[i].Ay <== pub_keys[i][1]; // public key y
    }
    address_selector[n - 1].out ==> winner;

}
component main {public [addresses, commitments, pub_keys]} = SelectWinner(10);