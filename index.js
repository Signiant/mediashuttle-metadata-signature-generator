const crypto = require('crypto');
const inquirer = require('inquirer');
const joi = require('joi');
const querystring = require('querystring');

const RequestType = {
    GetPackageDetails: 'GetPackageDetails',
    RedirectPackageMetadata: 'RedirectPackageMetadata'
};

const requestTypePrompt = {
    type: 'list',
    name: 'requestType',
    message: 'Which Media Shuttle Metadata request type do you want to generate a signed URL for',
    choices: [{
        name: 'Get package details REST API request',
        value: RequestType.GetPackageDetails
    }, {
        name: 'Metadata form POST redirect request',
        value: RequestType.RedirectPackageMetadata,
    }]
};

const portalPrefixPrompt = {
    type: 'input',
    name: 'portalPrefix',
    message: 'What is your Media Shuttle portal URL prefix (i.e. the subdomain name before .mediashuttle.com)?',
    validate: portalPrefix => {
        const {error} = joi.validate(portalPrefix, joi.string().regex(/^[A-Za-z0-9\-]+$/).lowercase());
        return error === null ? true : error.message;
    }
};

const packageIdPrompt = {
    type: 'input',
    name: 'packageId',
    message: 'What is the Media Shuttle package ID for this request?',
    validate: packageId => {
        const {error} = joi.validate(packageId, joi.string().alphanum());
        return error === null ? true : error.message;
    }
};

const requestBodyPrompt = {
    type: 'input',
    name: 'requestBody',
    message: 'What is the form POST body payload?'
};

const registrationKey = {
    type: 'input',
    name: 'registrationKey',
    message: 'What is your Media Shuttle Metadata Registration key?',
    validate: registrationKey => {
        const {error} = joi.validate(registrationKey, joi.string().uuid());
        return error === null ? true : error.message;
    }
};

const getPackageDetailsUrl = (portalPrefix, packageId) => {
    return `https://${portalPrefix}.mediashuttle.com/metadata/v3.0/portal/${portalPrefix}/package/${packageId}`;
};

const getFormRedirectUrl = (portalPrefix, packageId) => {
    return `${getPackageDetailsUrl(portalPrefix, packageId)}/metadata`;
};

const generateSignedUrl = (requestUrl, requestBody, registrationKey) => {
    const requestTimestamp = new Date().toISOString();

    // Generate canonical query string
    const algorithmParam = 'X-Sig-Algorithm=SIG1-HMAC-SHA256';
    const dateParam = `X-Sig-Date=${requestTimestamp}`;
    const canonicalQueryString = `${querystring.escape(algorithmParam)}&${querystring.escape(dateParam)}`;

    // Generate the string to sign
    const requestBodyHash = crypto.createHash('sha256').update(requestBody).digest('hex');
    const stringToSign = `${requestTimestamp}\n${requestUrl}\n${canonicalQueryString}\n${requestBodyHash}`;

    // Generate the signing key
    let hmac = crypto.createHmac('sha256', registrationKey);
    const signingKey = hmac.update(requestTimestamp).digest();

    // Generate request signature
    hmac = crypto.createHmac('sha256', signingKey);
    const signature = hmac.update(stringToSign).digest('hex');

    // Generate the signed URL
    const signatureParam = `X-Sig-Signature=${signature}`;
    return `${requestUrl}?${algorithmParam}&${dateParam}&${signatureParam}`;
};

inquirer.prompt(requestTypePrompt).then(({ requestType }) => {
    if (requestType === RequestType.GetPackageDetails) {
        inquirer.prompt([portalPrefixPrompt, packageIdPrompt, registrationKey])
            .then(({ portalPrefix, packageId, registrationKey }) => {
                const requestUrl = getPackageDetailsUrl(portalPrefix, packageId);
                const requestBody = '';
                const signedUrl = generateSignedUrl(requestUrl, requestBody, registrationKey);
                console.log(`\nSigned URL:\n\n${signedUrl}\n`);
            });
    } else {
        inquirer.prompt([portalPrefixPrompt, packageIdPrompt, requestBodyPrompt, registrationKey])
            .then(({ portalPrefix, packageId, requestBody, registrationKey }) => {
                const requestUrl = getFormRedirectUrl(portalPrefix, packageId);
                const signedUrl = generateSignedUrl(requestUrl, requestBody, registrationKey);
                console.log(`\nSigned URL:\n\n${signedUrl}\n`);
            });
    }
});
