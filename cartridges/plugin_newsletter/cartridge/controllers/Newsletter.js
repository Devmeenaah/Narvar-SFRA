'use strict';

var server = require('server');
//Use the following for CSRF protection: add middleware in routes and hidden field on form
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

server.get(
    'Show',
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        var actionUrl = dw.web.URLUtils.url('Newsletter-Handler');
        var newsletterForm = server.forms.getForm('newsletter');
        newsletterForm.clear();

        res.render('/newsletter/newslettersignup', {
            actionUrl: actionUrl,
            newsletterForm: newsletterForm
        });

        next();
    }
);

server.post(
    'Handler',
    csrfProtection.validateAjaxRequest,
    server.middleware.https,
    function (req, res, next) {
    	
    	var newsletterForm = server.forms.getForm('newsletter');
    	var URLUtils = require('dw/web/URLUtils');
		var CustomObjectMgr = require('dw/object/CustomObjectMgr');
		
		// Perform any server-side validation before this point, and invalidate form accordingly.
    	if (newsletterForm.valid) {
            this.on('route:BeforeComplete', function (req, res) {
                var Transaction = require('dw/system/Transaction');
                
                try {
                    Transaction.wrap(function () {
                        var CustomObject = CustomObjectMgr.createCustomObject('NewsletterSubscription', newsletterForm.email.value);
                	    CustomObject.custom.firstName = newsletterForm.fname.value;
                	    CustomObject.custom.lastName = newsletterForm.lname.value;
                	    
                        res.json({
                            success: true,
                            redirectUrl: URLUtils.url('Newsletter-Success').toString()
                        });
                    }); 
                } catch (e) {
                	var err = e;
                	var Resource = require('dw/web/Resource');
                	if (err.javaName === "MetaDataException") {
                		// Error is duplicate primary key: send back array with error message
	                	res.json({
	                		success: false,
	                        error: [Resource.msg('error.subscriptionexists', 'newsletter', null)]
	                    });
                	} else {
	                    // Error is missing custom object: Log error with clear message for site admin to see
                		var Logger = require('dw/system/Logger');
                		Logger.getLogger("newsletter subscription").error(Resource.msg('error.customobjectmissing', 'newsletter', null));
                		// Show error page: there is nothing user can do to fix this
                        res.setStatusCode(500);
                        res.json({
                            error: true,
                            redirectUrl: URLUtils.url('Newsletter-Error').toString()
                        });
                	}

                }
            });
    	} else {
            res.setStatusCode(500);
            res.json({
                error: true,
                redirectUrl: URLUtils.url('Newsletter-Error').toString()
            });
    	}
  		
        next();
    }
);

server.get(
    'Success',
    server.middleware.https,
    function (req, res, next) {
    	var continueUrl = dw.web.URLUtils.url('Newsletter-Show');
    	var newsletterForm = server.forms.getForm('newsletter');
    	
        res.render('/newsletter/newslettersuccess', {
            continueUrl: continueUrl,
        	newsletterForm: newsletterForm
        });

        next();
    }
);

server.get(
    'Error',
    server.middleware.https,
    function (req, res, next) {
    	var continueUrl = dw.web.URLUtils.url('Newsletter-Show');
    	var newsletterForm = server.forms.getForm('newsletter');
    	
        res.render('/newsletter/newslettererror', {
            continueUrl: continueUrl,
        	newsletterForm: newsletterForm
        });

        next();
    }
);

module.exports = server.exports();