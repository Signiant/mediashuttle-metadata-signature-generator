const crypto = require('crypto');
const inquirer = require('inquirer');
const querystring = require('querystring');

let questions = [{
    type: 'input',
    name: 'portalPrefix',
    message: 'What is your Media Shuttle portal URL prefix (i.e. the subdomain name before .mediashuttle.com)?'
}, {
    type: 'input',
    name: 'packageId',
    message: 'What is the Media Shuttle package ID you wish to request metadata for?'
}, {
    type: 'input',
    name: 'registrationKey',
    message: 'What is your Media Shuttle Metadata Registration key?'
}];

inquirer.prompt(questions).then(answers => {
    const { portalPrefix, packageId, registrationKey } = answers;

    // The request timestamp
    const requestTimestamp = new Date().toISOString();

    // Generate canonical URL
    const canonicalUrl = `https://${portalPrefix}.mediashuttle.com/metadata/v3.0/portal/${portalPrefix}/package/${packageId}`;

    // Generate canonical query string
    const algorithmParam = 'X-Sig-Algorithm=SIG1-HMAC-SHA256';
    const dateParam = `X-Sig-Date=${requestTimestamp}`;
    const canonicalQueryString = `${querystring.escape(algorithmParam)}&${querystring.escape(dateParam)}`;

    // Generate the string to sign
    const payloadHash = crypto.createHash('sha256').update('').digest('hex');
    const stringToSign = `${requestTimestamp}\n${canonicalUrl}\n${canonicalQueryString}\n${payloadHash}`;

    // Generate the signing key
    let hmac = crypto.createHmac('sha256', registrationKey);
    const signingKey = hmac.update(requestTimestamp).digest();

    // Generate final signature
    hmac = crypto.createHmac('sha256', signingKey);
    const signature = hmac.update(stringToSign).digest('hex');
    const signatureParam = `X-Sig-Signature=${signature}`;
    const signedUrl = `${canonicalUrl}?${algorithmParam}&${dateParam}&${signatureParam}`;

    console.log(`Signed request URL: ${signedUrl}`);
});

