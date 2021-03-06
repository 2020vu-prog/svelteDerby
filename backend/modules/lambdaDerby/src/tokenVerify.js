const log = require("loglevel");
const dump = (decodedToken) => {
    if (decodedToken) {
        const expDate = new Date();
        expDate.setTime(decodedToken.exp * 1000);

        log.debug("expires", decodedToken.exp);
        log.debug("expires", expDate);
    } else {
        log.debug("no token");
    }
};
const token =
    "eyJraWQiOiJTK0F5dWQzS3BBSTVUXC9TZzUraTYrV29hcXFKMTZwbEpCUGFWQzNieFBTOD0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhNDJjMjhmMS1iYTcxLTRlMjItYmZmNi1iN2UwOWNiZDAwYWQiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXR0cmlidXRlX2tleTIiOiJhdHRyaWJ1dGVfY2p3MiIsImF0dHJpYnV0ZV9rZXkxIjoiYXR0cmlidXRlX2NqdzEiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0yLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMl9nSFlBb2djcHkiLCJjb2duaXRvOnVzZXJuYW1lIjoiY2xjNCIsImF1ZCI6Ijc1NWhsaHBnaW9tYzM4ajExdW0xM2V1b2FlIiwiZXZlbnRfaWQiOiI0MDI5OGJjYy03NzEyLTQ0ZmItOTQ4ZC04OTcyM2Y3Mzk3MTkiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTU4MjE2ODkyMiwiZXhwIjoxNTgyMTcyNTIzLCJpYXQiOjE1ODIxNjg5MjMsImVtYWlsIjoiMjAyMHZ1QGdtYWlsLmNvbSJ9.H4TK3UGiJAnaBDa4xHpFiPwJmb-3y0fFt6Z0ywhC2_6qloV2oRMQ2PS2_Vie34QPU0nmtw0ORRi7LgqfQwDrG68Y8bee2kpeDwnelLFSzvHjeyS5FehXd082T0x5C6hG-gY6MOQQaAosx88Ag9xGXXd1XSmnMjgzi5NWGd7X05QJjw9zIOvOh_KvPXFtUkr36iEXLrthuXz8il6e0tJZLqVBXGFPD1WsObocSxl3blx4eRubr5viIkLDh_SxoNZRU7FZUFHh-0pdTO_ulYXir41hgJpZRVhXwO13MgGiIycOrjUkd6ostszOvIV6pQcTdVqPQ6QRujEH43W_7RqjzA";
// jwk from: curl https://cognito-idp.us-east-2.amazonaws.com/us-east-2_gHYAogcpy/.well-known/jwks.json|jq .
const jwk = {
    keys: [
        {
            alg: "RS256",
            e: "AQAB",
            kid: "S+Ayud3KpAI5T/Sg5+i6+WoaqqJ16plJBPaVC3bxPS8=",
            kty: "RSA",
            n:
                "rqMEesFEekFNO_RDgXEGt1xkK1VtvedhcJWIeNQUq12hWvsU0-TvmVgKdQmu9NVk0DS99SoGlsjFgyKJ4nY_Aknn8Qj2NTucklDIfpa_6psbce6b3IRkSBGqN5Y5lhdF0jgoLINjtL6aC07ykC_nk-ekqXCQFlbsQr9mtIyCsdzATsY0z2q2WXW0YfGJZOHMOokacdovYvU-LHW9DTF2m5JeoRkJ_DB-C6_WFXJYQ8_myVUekO6EjvGsUvbzrhsTI5pRpZw5r284pl-8mrv_JjC_F_LNg_mPNP2bbwqLzdOHXRHMLs2sSk5kAPj-LBAwKXJmtNkKRgzOtsjub0brsw",
            use: "sig",
        },
        {
            alg: "RS256",
            e: "AQAB",
            kid: "6J+i8nxlzqrjK7XQjnGYKq2GELZKtLlWD6lv8YWEznU=",
            kty: "RSA",
            n:
                "pDd3dFVNIlUxtQGk9akJPguhBNB3P2uhoF7NWm-b2t-t9tkJQKj1EwBWn5_t5QIULd8H20uEs5J_akIG_7cD0xkz5Ii2sxRmuxffWWqcj1GsGNlvQHeJMYVzJBist4WF6QXC83R1P2mTePbhkY5KmoePeJpOFiQ6XaWtWdxonUtsQOiXM8lfhCVIgsPPMXsZHy3YrCP72oSEMmBjmPgSdjL8JIqFSPUHvxr9uswBESBppgq71ZW7Vmjdkx6HnaSWVb07HYQhfQRGR8PQCvU-WLYrKcoqJVSAfWY6SrTRsjKJCnGPbTTOmEug_kudpqmw8VtUCVOZKk04mIAxy8A64Q",
            use: "sig",
        },
    ],
};
var jwt = require("jsonwebtoken");
var jwkToPem = require("jwk-to-pem");
//var unverified = jwt.decode(token);
//	dump(unverified);

const verifyToken = (token) => {
    var pem = jwkToPem(jwk.keys[0]);
    log.debug(token);
    try {
        //const x= jwt.verify(token, pem, { algorithms: ['RS256'] });
        const x = jwt.verify(token, pem, {
            algorithms: ["RS256"],
            iss:
                "Xhttps://cognito-idp.us-east-2.amazonaws.com/us-east-2_gHYAogcpy",
            aud: "XX755hlhpgiomc38j11um13euoae",
        });
        log.debug("verified :", x);
        return x;
    } catch (err) {
        log.debug("decode failed:", err);
    }
};
const test = () => {
    start = [];
    done = [];
    for (var i = 0; i < 1000; i++) {
        dump(verifyToken(token));
        /*
		start[i]=new Date();
	var pem = jwkToPem(jwk.keys[0]);
	jwt.verify(token, pem, { algorithms: ['RS256'] }, function(err, decodedToken) {
		done[i]=new Date();

		log.debug("elapsed:",done[i].getTime() - start[i].getTime());
		log.debug("err",err);
		log.debug("decoded",decodedToken);
		dump(decodedToken);
	});
*/
    }
};
test();
