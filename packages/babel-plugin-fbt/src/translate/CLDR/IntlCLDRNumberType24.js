/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @generated SignedSource<<34cf21de957698bdc8111f6e5467bf60>>
 *
 * Generated by LanguageCLDRGenScript
 * @codegen-command: flib/intern/scripts/intl/cldr/gencode_all_plurals.sh
 *
 * @flow strict
 */

'use strict';

const IntlCLDRNumberType24 = {
  getNumberVariations(): $ReadOnlyArray<number> {
    return [4,8,12,24];
  },

  getFallback(): number {
    return 24;
  }
};

module.exports = IntlCLDRNumberType24;