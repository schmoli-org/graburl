//
//  SafariWebExtensionHandler.swift
//  Safari Copy URL Extension
//
//  Created by Toli Leonovich on 6/3/26.
//

import SafariServices

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let response = NSExtensionItem()
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
    }

}
