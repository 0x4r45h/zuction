pragma circom 2.0.0;

include "./decrypt.circom";
include "../../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

// each commitment is
// [0] iv
// [1] actual bid
// [2] // sig R8x
// [3] // sig R8y
// [4] // S
template LessThanWinner() {
    signal input shared_keys[2];

    // pub_keys[0] is winner and [1] is loser
    signal input pub_keys[2][2];

    // commitment[0] is winner and [1] is loser
    signal input commitments[2][2];

    // [0] // sig R8x
    // [1] // sig R8y
    // [2] // S
    signal input signatures[2][3];

    signal output out;
    // Decrypt message
    component decrypted_command[2];
    for (var i = 0; i <2; i++) {
        decrypted_command[i] =  Decrypt(1);
        decrypted_command[i].private_key <== shared_keys[i];
        decrypted_command[i].message[0] <== commitments[i][0]; // iv
        decrypted_command[i].message[1] <== commitments[i][1]; // actual bid
        // decrypted_command[i].message[2] <== commitments[i][2]; // sig R8x
        // decrypted_command[i].message[3] <== commitments[i][3]; // sig R8y
        // decrypted_command[i].message[4] <== commitments[i][4]; // S
        log(decrypted_command[i].out[0]);
    }
    // Verify signature against user public key, note that signature must be valid or this will panic
    component signature_verifier[2];
    for (var i = 0; i <2; i++) {
        signature_verifier[i] = EdDSAPoseidonVerifier();
        signature_verifier[i].enabled <== 1; // i think this cause panic if signature is not valid
        signature_verifier[i].M <== decrypted_command[i].out[0]; // Plain message
        signature_verifier[i].R8x <== signatures[i][0]; // sig R8x
        signature_verifier[i].R8y <== signatures[i][1]; // sig R8y
        signature_verifier[i].S <== signatures[i][2]; // sig S
        signature_verifier[i].Ax <== pub_keys[i][0]; // public key x
        signature_verifier[i].Ay <== pub_keys[i][1]; // public key y
    }
    component lt = LessThan(16); // assuming max bid is 65545
    // loser's bid should be less than winner
    lt.in[0] <== decrypted_command[1].out[0]; //loser
    lt.in[1] <== decrypted_command[0].out[0];
    log(lt.out);
    out <== lt.out;

}
component main  {public [pub_keys, commitments, signatures ]} = LessThanWinner();