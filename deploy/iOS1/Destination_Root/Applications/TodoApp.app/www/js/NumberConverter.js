/*
 *  Licensed to the Apache Software Foundation (ASF) under one
 *  or more contributor license agreements.  See the NOTICE file
 *  distributed with this work for additional information
 *  regarding copyright ownership.  The ASF licenses this file
 *  to you under the Apache License, Version 2.0 (the
 *  "License"); you may not use this file except in compliance
 *  with the License.  You may obtain a copy of the License at
 * 
 *  http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

/**
 * constructor of client side NumberConverter class
 */ 
window.TrNumberConverter = function(
  pattern,  
  type,
  locale,
  messages,
  integerOnly,
  groupingUsed,
  currencyCode,
  currencySymbol,
  maxFractionDigits,
  maxIntegerDigits,
  minFractionDigits,
  minIntegerDigits)
{
  this._pattern = pattern;
  this._type = type;
  this._locale = locale;
  this._messages = messages;
  this._currencyCode = currencyCode;
  this._currencySymbol = currencySymbol;
  this._maxFractionDigits = maxFractionDigits;
  this._maxIntegerDigits = maxIntegerDigits;
  this._minFractionDigits = minFractionDigits;
  this._minIntegerDigits = minIntegerDigits;
  
  //set the integerOnly value
  if(integerOnly !== undefined)
    this._integerOnly = integerOnly;
  else
    this._integerOnly = false;
    
  //set the groupingUsed value
  if(groupingUsed !== undefined)
    this._groupingUsed = groupingUsed;
  else
    this._groupingUsed = true;
    
  //init the TrNumberFormat
  this._initNumberFormat(locale);
  
  // for debugging
  this._class = "TrNumberConverter";
};

TrNumberConverter.prototype = new TrConverter();

//***********************
// PUBLIC
//***********************

TrNumberConverter.prototype.setCurrencyCode = function(currencyCode)
{
  this._currencyCode = currencyCode;
}
TrNumberConverter.prototype.getCurrencyCode = function()
{
  return this._currencyCode;
}
TrNumberConverter.prototype.setCurrencySymbol = function(currencySymbol)
{
  this._currencySymbol = currencySymbol;
}
TrNumberConverter.prototype.getCurrencySymbol = function()
{
  return this._currencySymbol;
}

TrNumberConverter.prototype.setMaxFractionDigits = function(maxFractionDigits)
{
  this._maxFractionDigits = maxFractionDigits;
}
TrNumberConverter.prototype.getMaxFractionDigits = function()
{
  return this._maxFractionDigits;
}

TrNumberConverter.prototype.setMaxIntegerDigits = function(maxIntegerDigits)
{
  this._maxIntegerDigits = maxIntegerDigits;
}
TrNumberConverter.prototype.getMaxIntegerDigits = function()
{
  return this._maxIntegerDigits ;
}

TrNumberConverter.prototype.setMinFractionDigits = function(minFractionDigits)
{
  this._minFractionDigits = minFractionDigits;
}
TrNumberConverter.prototype.getMinFractionDigits = function()
{
  return this._minFractionDigits;
}

TrNumberConverter.prototype.setMinIntegerDigits = function(minIntegerDigits)
{
  this._minIntegerDigits = minIntegerDigits;
}
TrNumberConverter.prototype.getMinIntegerDigits = function()
{
  return this._minIntegerDigits;
}

TrNumberConverter.prototype.setGroupingUsed = function(groupingUsed)
{
  this._groupingUsed = groupingUsed;
}
TrNumberConverter.prototype.isGroupingUsed = function()
{
  return this._groupingUsed;
}

TrNumberConverter.prototype.setIntegerOnly = function(integerOnly)
{
  this._integerOnly = integerOnly;
}
TrNumberConverter.prototype.isIntegerOnly = function()
{
  return this._integerOnly;
}

TrNumberConverter.prototype.getFormatHint = function()
{
  if(this._messages && this._messages["hintPattern"])
  {
    return TrMessageFactory.createCustomMessage(
      this._messages["hintPattern"],
      this._pattern);
  }
  else
  {
    if(this._pattern)
    {
      return TrMessageFactory.createMessage(
      "org.apache.myfaces.trinidad.convert.NumberConverter.FORMAT_HINT",
      this._pattern);
    }
    else
    {
      return null;
    }
  }
}

/**
 * Returns the number value as string or undefined (see also _isConvertible).
 */
TrNumberConverter.prototype.getAsString = function(
  number,
  label
  )
{
  if(this._isConvertible()) // TODO nothing was passed in here but seems a string is needed?
  {
    if(this._type=="percent" || this._type=="currency")
    {
      var string = this._numberFormat.format(number);
      if(this._type=="currency")
      {
        //In Trinidad the currencyCode gets preference over currencySymbol
        //this is similar on the server-side
        if(this._currencyCode)
        {
          string = string.replace(getLocaleSymbols().getCurrencyCode(), this._currencyCode);
        }
        else if(this._currencySymbol)
        {
          string = string.replace(getLocaleSymbols().getCurrencySymbol(), this._currencySymbol);
        }
      }
      return string;
    }
    else
    {
      if(typeof number === "string")
      {
        return this._numberFormat.format(parseFloat(number));
      }
      else
      {
        return this._numberFormat.format(parseFloat(number.toFixed(this._numberFormat.getMaximumFractionDigits())));
      }
    }
  }
  else
  {
    return undefined;
  }
}

/**
 * Returns the number value for the submitted string or undefined (see also _isConvertible).
 */
TrNumberConverter.prototype.getAsObject = function(
  numberString,
  label
  )
{
  numberString = TrFormatUtils.trim(numberString);
  
  if(this._isConvertible(numberString))
  {
    // The following are from the javadoc for Number and DateTimeConverter.
    // If the specified String is null, return a null. Otherwise, trim leading and trailing whitespace before proceeding.
    // If the specified String - after trimming - has a zero length, return null.
    if (numberString == null)
      return null;
    
    if (typeof numberString != "string")
      numberString = ""+numberString;
    
    if (numberString.length == 0)
      return null

    var parsedValue;
    if(this._type=="percent" || this._type=="currency")
    {
      var localeSymbols = getLocaleSymbols(this._locale);
      
      // TODO matzew - see TRINIDAD-682
      // Remove the thousands separator - which Javascript doesn't want to see
      var groupingSeparator = localeSymbols.getGroupingSeparator();
      
      if (groupingSeparator == "\xa0")
      {
        var normalSpace = new RegExp("\\ " , "g");
        numberString = numberString.replace(normalSpace, "\xa0");
      }
      
      var grouping = new RegExp("\\" + groupingSeparator, "g");
      numberString = numberString.replace(grouping, "");

      // Then change the decimal separator into a period, the only
      // decimal separator allowed by JS
      var decimalSeparator = localeSymbols.getDecimalSeparator();
      var decimal = new RegExp("\\" + decimalSeparator, "g");
      numberString = numberString.replace(decimal, ".");
      
      try
      {
        // parse the numberString
        numberString = this._numberFormat.parse(numberString)+"";     
      }
      catch(e)
      {
        // The user could have just left off the percent/currency symbol, so try 
        // parsing 'numberString' as a Number instead; if it still fails, then 
        // throw a converter exception.
        try
        {
          numberString = TrNumberFormat.getNumberInstance().parse(numberString)+"";
        }
        catch (e)
        {
          var facesMessage;
          var example = this._numberFormat.format(this._example);
          var key = "org.apache.myfaces.trinidad.convert.NumberConverter.CONVERT_" + this._type.toUpperCase();
          if (this._messages && this._messages[this._type])
          {
            facesMessage = _createCustomFacesMessage(TrMessageFactory.getSummaryString(key), this._messages[this._type], label, numberString, example);
          }
          else 
          {
            facesMessage = _createFacesMessage(key, label, numberString, example);
          }

          throw new TrConverterException(facesMessage);
        }
      }
      
      // to be able to pass the _decimalParse, we replace the decimal separator...
      // Note that _decimalParse uses the page locale.
      var jsSeparator = new RegExp("\\" + ".",  "g");
      numberString = numberString.replace(jsSeparator, getLocaleSymbols().getDecimalSeparator());
    }
    
    parsedValue = _decimalParse(numberString, 
                         this._messages,
                         "org.apache.myfaces.trinidad.convert.NumberConverter",
                         null,
                         null,
                         null,
                         null,
                         label,
                         !this.isIntegerOnly());

    parsedValue = parseFloat(parsedValue.toFixed(this._numberFormat.getMaximumFractionDigits()));

    if(this._type=="percent")
    {
      parsedValue = parsedValue / 100;
    }
    return parsedValue;
  }
  else
  {
    return undefined;
  }
}

//***********************
// PRIVATE
//***********************

/**
 * Checks if this converter can convert the value, which
 * is only true, if no pattern is set and the type is a number
 */
TrNumberConverter.prototype._isConvertible = function(numberString)
{
  // The locale attribute is now supported on convertNumber.
  if (this._pattern != null)
    return false;

  // check other common criteria as well.
  return TrFormatUtils.isNumberConvertible(numberString);   

}

/**
 * runs the creation of the used TrNumberFormat class
 */
TrNumberConverter.prototype._initNumberFormat = function(locale)
{
  if(this._type=="percent")
  {
    this._example = 0.3423;
    this._numberFormat = TrNumberFormat.getPercentInstance(locale);
  }
  else if(this._type=="currency")
  {
    this._example = 10250;
    this._numberFormat = TrNumberFormat.getCurrencyInstance(locale, this._currencyCode, this._currencySymbol);
  }
  else if(this._type=="number")
  {
  	this._numberFormat = TrNumberFormat.getNumberInstance(locale);
  }

  this._numberFormat.setGroupingUsed(this.isGroupingUsed());
  this._numberFormat.setMaximumFractionDigits(this.getMaxFractionDigits());
  this._numberFormat.setMaximumIntegerDigits(this.getMaxIntegerDigits());
  this._numberFormat.setMinimumFractionDigits(this.getMinFractionDigits());
  this._numberFormat.setMinimumIntegerDigits(this.getMinIntegerDigits());
}
