import XCTest
import SwiftTreeSitter
import TreeSitterDataPrime

final class TreeSitterDataPrimeTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_dataprime())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading DataPrime grammar")
    }
}
