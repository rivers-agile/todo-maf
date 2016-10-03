/* Copyright (c) 2013, 2016, Oracle and/or its affiliates. All rights reserved. */
/* ----------------------------------------------------------- */
/* -------------------- amx-filmStrip.js --------------------- */
/* ----------------------------------------------------------- */
(function()
{
  var dottedPageControl = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "dottedPageControl");
  var TOUCH_EVENTS = {
    "start": amx.hasTouch() ? "touchstart" : "mousedown",
    "end": amx.hasTouch() ? "touchend" : "mouseup",
    "move": amx.hasTouch() ? "touchmove" : "mousemove",
    "cancel": amx.hasTouch() ? "touchcancel" : "mouseleave"
  };

  dottedPageControl.prototype.render = function(amxNode, id)
  {
    // do nothing special here
    // everything is done inside of 
    // the postDisplay/refresh funstion
    return document.createElement("div");
  };

  var calculateOptions = function(options)
  {
    // verifies that displayArrowLabels option has proper values
    var arrowLabelsCheck = function(value)
    {
      if (value === 'inside' || value === 'outside')
      {
        return value;
      }
      return 'none';
    };
    // verifies that listener is defined and is a function
    var listenerCheck = function(value)
    {
      if (!value || typeof value['pagechange'] !== 'function')
      {
        return {
          'pagechange': function(index){ /* empty function */}
        };
      }
      
      return {'pagechange': value['pagechange']};
    };
    // check default values
    return {
      'pageCount': options['pageCount'] || 0,
      'currentIndex': options['currentIndex'] || 0,
      'lastGroupBehavior': options['lastGroupBehavior'] === 'full' ? 'full' : 'remaining',
      'dotsPerGroup': Math.max(1, parseInt(options['dotsPerGroup']) || 10),
      'displayArrowLabels': arrowLabelsCheck(options['displayArrowLabels']),
      'on': listenerCheck(options['on'])
    };
  };

  dottedPageControl.prototype.__getRefreshProperty = function()
  {
    return "__refreshPageState";
  };

  var _isSupportedParent = function(amxNode)
  {
    var typeHandler = amxNode.getTypeHandler();
    if (!typeHandler)
    {
      return false;
    }

    if (adf.mf.internal.amx.implementsFunction(typeHandler, "getPageCount")
     && adf.mf.internal.amx.implementsFunction(typeHandler, "getCurrentPageIndex")
     && adf.mf.internal.amx.implementsFunction(typeHandler, "setCurrentPageByIndex"))
    {
      return true;
    }
    return false;
  };

  dottedPageControl.prototype.postDisplay = function(rootElement, amxNode)
  {
    var parent = amxNode.getParent();
    if (!_isSupportedParent(parent))
    {
      return;
    }

    var typeHandler = parent.getTypeHandler();
    var options = {
      'vertical': parent.getAttribute("orientation") === "vertical",
      'pageCount': typeHandler.getPageCount(parent),
      'currentIndex': typeHandler.getCurrentPageIndex(parent),
      'lastGroupBehavior': amxNode.getAttribute("lastPageSetBehavior"),
      'dotsPerGroup': amxNode.getAttribute("dotsInPageSet"),
      'displayArrowLabels': amxNode.getAttribute("displayPageCount"),
      'on': {
        'pagechange': function(newPageIndex)
        {
          typeHandler.setCurrentPageByIndex(parent, newPageIndex, true);
        }
      }
    };

    _renderDottedPageControl(rootElement, parent, options);
  };

  dottedPageControl.prototype.updateChildren = function(amxNode, changes)
  {
    var parent = amxNode.getParent();
    // force page control to refresh
    parent.setAttributeResolvedValue("_currentPosition", null);

    return adf.mf.api.amx.AmxNodeChangeResult['REFRESH'];
  };

  var _renderDottedPageControl = function(rootElement, masterAmxNode, options)
  {
    options = calculateOptions(options);
    if (!rootElement || !masterAmxNode)
    {
      return;
    }

    var pageCount = options['pageCount'];
    var currentIndex = options['currentIndex'];
    var displayArrowLabels = options['displayArrowLabels'];
    var vertical = options['vertical'];

    var oldPosition = masterAmxNode.getAttribute("_currentPosition");
    var animateGroups = false;
    var buttonsToRender;
    var groupOffset = 0;

    var position = currentIndex + '/' + pageCount;
    if (oldPosition === position)
    {
      return;
    }

    var createListener = function (index, holdIndex)
    {
      return function (event)
      {
        if (event.data && event.data.type == "tapHold" && holdIndex != null)
        {
          index = holdIndex;
        }

        event.stopPropagation();
        event.preventDefault();

        options['on']['pagechange'](index);
      };
    };

    masterAmxNode.setAttributeResolvedValue("_currentPosition", position);

    var lastGroupBehavior = options["lastGroupBehavior"];
    var maxButtons = options["dotsPerGroup"];

    var currentGroupIndex = Math.floor(currentIndex / maxButtons);
    var oldGroupIndex = masterAmxNode.getAttribute("_currentGroupIndex") || 0;

    if (lastGroupBehavior !== 'remaining')
    {
      if (Math.abs(oldGroupIndex - currentGroupIndex) === 1)
      {
        if (currentIndex >= pageCount - maxButtons && currentIndex < (Math.floor(pageCount / maxButtons)) * maxButtons)
        {
          currentGroupIndex = oldGroupIndex;
        }
      }
    }

    if (oldGroupIndex != null && oldGroupIndex != currentGroupIndex)
    {
      animateGroups = true;
    }

    masterAmxNode.setAttributeResolvedValue("_currentGroupIndex", currentGroupIndex);

    var groupBehaviorChanged = lastGroupBehavior !== masterAmxNode.getAttribute("_prevLastGroupBehavior");

    masterAmxNode.setAttributeResolvedValue("_prevLastGroupBehavior", lastGroupBehavior);

    if (lastGroupBehavior === 'remaining')
    {
      buttonsToRender = Math.min(pageCount - currentGroupIndex * maxButtons, maxButtons);
    }
    else
    {
      buttonsToRender = Math.min(pageCount, maxButtons);
      var remaining = Math.min(pageCount - currentGroupIndex * maxButtons, maxButtons);
      groupOffset = buttonsToRender - remaining;
    }

    if (vertical)
    {
      rootElement.classList.add("vertical");
    }
    else
    {
      rootElement.classList.remove("vertical");
    }
    // verify if startArrow is rendered and render it on the first position
    var startArrow = rootElement.querySelector(".amx-dottedPageControl_startArrow");
    if (!startArrow)
    {
      startArrow = document.createElement("div");
      startArrow.className = "amx-dottedPageControl_startArrow amx-filmStrip_pageControlButton"
      var startChevron = document.createElement("div");
      startChevron.className = "amx-filmStrip_pageControlButton-chevron";
      startArrow.appendChild(startChevron);

      if (rootElement.firstElementChild)
      {
        rootElement.insertBefore(startArrow, rootElement.firstElementChild);
      }
      else
      {
        rootElement.appendChild(startArrow);
      }
    }

    var endArrow = rootElement.querySelector(".amx-dottedPageControl_endArrow");
    if (!endArrow)
    {
      endArrow = document.createElement("div");
      endArrow.className = "amx-dottedPageControl_endArrow amx-filmStrip_pageControlButton";
      var endChevron = document.createElement("div");
      endChevron.className = "amx-filmStrip_pageControlButton-chevron";
      endArrow.appendChild(endChevron);

      rootElement.appendChild(endArrow);
    }

    var dots = rootElement.querySelector(".amx-dottedPageControl_dotsContainer > .amx-dottedPageControl_dots");
    if (!dots)
    {
      var dotsContainer = document.createElement("div");
      dotsContainer.className = "amx-dottedPageControl_dotsContainer";

      dots = document.createElement("div");
      dots.className = "amx-dottedPageControl_dots";
      dotsContainer.appendChild(dots);

      rootElement.insertBefore(dotsContainer, endArrow);
    }

    if (currentGroupIndex > 0)
    {
      startArrow.classList.add("enabled");
      var startLabel = startArrow.querySelector(".amx-filmStrip_pageControlButton-label");
      adf.mf.api.amx.removeDomNode(startLabel);

      if (displayArrowLabels !== 'none')
      {
        startLabel = document.createElement("div");
        if (displayArrowLabels === 'inside')
        {
          startLabel.className = "amx-filmStrip_pageControlButton-label inside";
          startArrow.appendChild(startLabel);
        }
        else
        {
          startLabel.className = "amx-filmStrip_pageControlButton-label outside";
          startArrow.insertBefore(startLabel, startArrow.firstElementChild);
        }
        startLabel.textContent = "" + (currentGroupIndex * maxButtons - groupOffset);
      }
     
      var prevListener = masterAmxNode.getAttribute("_saListener");
      if (prevListener)
      {
        adf.mf.api.amx.removeBubbleEventListener(startArrow, TOUCH_EVENTS["start"], prevListener['start']);
        adf.mf.api.amx.removeBubbleEventListener(startArrow, TOUCH_EVENTS["end"], prevListener['end']);
        adf.mf.api.amx.removeBubbleEventListener(startArrow, TOUCH_EVENTS["cancel"], prevListener['cancel']);
      }
      var listener = createListener(currentGroupIndex * maxButtons - 1 - groupOffset, maxButtons - 1);

      _addTapHoldEventListener(startArrow, function(start, end, cancel)
      {
        var ls = {'start':start, 'end':end,'cancel':cancel}
        masterAmxNode.setAttributeResolvedValue("_saListener", ls)
        adf.mf.api.amx.addBubbleEventListener(startArrow, TOUCH_EVENTS["start"], start);
        adf.mf.api.amx.addBubbleEventListener(startArrow, TOUCH_EVENTS["end"], end);
        adf.mf.api.amx.addBubbleEventListener(startArrow, TOUCH_EVENTS["cancel"], cancel);
      },
      listener);
    }
    else 
    {
      var prevListener = masterAmxNode.getAttribute("_saListener");
      if (prevListener)
      {
        masterAmxNode.setAttributeResolvedValue("_saListener", null);
        adf.mf.api.amx.removeBubbleEventListener(startArrow, TOUCH_EVENTS["start"], prevListener['start']);
        adf.mf.api.amx.removeBubbleEventListener(startArrow, TOUCH_EVENTS["end"], prevListener['end']);
        adf.mf.api.amx.removeBubbleEventListener(startArrow, TOUCH_EVENTS["cancel"], prevListener['cancel']);
      }
      startArrow.classList.remove("enabled");
    }

    if (currentGroupIndex < Math.floor((pageCount - 1) / maxButtons))
    {
      endArrow.classList.add("enabled");
      var endLabel = endArrow.querySelector(".amx-filmStrip_pageControlButton-label");
      adf.mf.api.amx.removeDomNode(endLabel);

      if (displayArrowLabels !== 'none')
      {
        endLabel = document.createElement("div");
        if (displayArrowLabels === 'inside')
        {
          endLabel.className = "amx-filmStrip_pageControlButton-label inside";
          endArrow.insertBefore(endLabel, endArrow.firstElementChild);
        }
        else
        {
          endLabel.className = "amx-filmStrip_pageControlButton-label outside";
          endArrow.appendChild(endLabel);
        }
        endLabel.textContent = "" + (pageCount - (currentGroupIndex + 1) * maxButtons);
      }

      var prevListener = masterAmxNode.getAttribute("_eaListener");
      if (prevListener)
      {
        adf.mf.api.amx.removeBubbleEventListener(endArrow, TOUCH_EVENTS["start"], prevListener['start']);
        adf.mf.api.amx.removeBubbleEventListener(endArrow, TOUCH_EVENTS["end"], prevListener['end']);
        adf.mf.api.amx.removeBubbleEventListener(endArrow, TOUCH_EVENTS["cancel"], prevListener['cancel']);
      }
      var listener = createListener((currentGroupIndex + 1) * maxButtons, Math.floor(pageCount / maxButtons) * maxButtons);

      _addTapHoldEventListener(endArrow, function(start, end, cancel)
      {
        var ls = {'start': start, 'end': end,'cancel': cancel}
        masterAmxNode.setAttributeResolvedValue("_eaListener", ls);
        adf.mf.api.amx.addBubbleEventListener(endArrow, TOUCH_EVENTS["start"], start);
        adf.mf.api.amx.addBubbleEventListener(endArrow, TOUCH_EVENTS["end"], end);
        adf.mf.api.amx.addBubbleEventListener(endArrow, TOUCH_EVENTS["cancel"], cancel);
      },
      listener);
    }
    else 
    {
      var prevListener = masterAmxNode.getAttribute("_eaListener");
      if (prevListener)
      {
        masterAmxNode.setAttributeResolvedValue("_eaListener", null);
        adf.mf.api.amx.removeBubbleEventListener(endArrow, TOUCH_EVENTS["start"], prevListener['start']);
        adf.mf.api.amx.removeBubbleEventListener(endArrow, TOUCH_EVENTS["end"], prevListener['end']);
        adf.mf.api.amx.removeBubbleEventListener(endArrow, TOUCH_EVENTS["cancel"], prevListener['cancel']);
      }
      endArrow.classList.remove("enabled");
    }

    if (animateGroups)
    {
      dots.classList.add("old");
      var newDots = document.createElement("div");
      newDots.className = "amx-dottedPageControl_dots new";

      for (var i = 0; i < buttonsToRender; i++)
      {
        var dot = document.createElement("div");
        dot.className = "amx-dottedPageControl_dot amx-filmStrip_pageControlButton";
        var chevron = document.createElement("div");
        chevron.className = "amx-filmStrip_pageControlButton-chevron";
        dot.appendChild(chevron);
        var realIndex = currentGroupIndex * maxButtons + i - groupOffset;
        if (currentIndex === realIndex)
        {
          dot.classList.add("selected");
        }

        adf.mf.api.amx.addBubbleEventListener(dot, TOUCH_EVENTS["start"], createListener(realIndex));
        newDots.appendChild(dot);
      }

      dots.parentElement.appendChild(newDots);

      var properties = {};

      properties["parentFlipAllowed"] = false;
      properties["dimensionsFromParent"] = false;
      properties["finishedFunction"] = adf.shared.impl.animationUtils.getProxyFunction(this, function (callbackParams)
      {
        var newDots = callbackParams[0];
        var dots = callbackParams[1];
        var fn = callbackParams[2];
        var parent = dots.parentNode;
        if (parent)
        {
          var childNodes = parent.childNodes;
          var childNodeCount = childNodes.length;
          for (var i = childNodeCount; i >= 0; --i)
          {
            var child = childNodes[i];
            if (child != newDots)
              adf.mf.api.amx.removeDomNode(child);
          }
        }
        newDots.classList.remove("new");
        // restore page change events
        options['on']['pagechange'] = fn;
      });
      properties["callbackParams"] = [newDots, dots, options['on']['pagechange']];
      properties["animationEnabled"] = true;
      properties["isRtl"] = document.documentElement.dir == "rtl";
      properties["fineLogger"] = function (message)
      {
        adf.mf.log.AMX.logp(adf.mf.log.level.FINEST, "adf.mf.internal.amx.deck", "refresh", message);
      };
      var anim = (vertical ? ["slideDown", "slideUp"] : ["slideRight", "slideLeft"]); 
      // disable page fireing page changes
      options['on']['pagechange'] = function(){};
      adf.shared.impl.animationUtils.transition(// WARNING this is impl (not a public API) and will change without notice     
      oldGroupIndex > currentGroupIndex ? anim[0] : anim[1], dots, newDots, properties);
    }
    else 
    {
      if (groupBehaviorChanged)
      {
        adf.mf.api.amx.emptyHtmlElement(dots);
      }

      var forRemoval = [];
      for (var i = 0, size = Math.max(buttonsToRender, dots.childNodes.length); i < size; i++)
      {
        var realIndex = currentGroupIndex * maxButtons + i - groupOffset;
        var dot = dots.childNodes[i];
        // remove dots which we don't want
        if (buttonsToRender <= i)
        {
          if (dot)
          {
            forRemoval.push(dot);
            dot = null;
          }
        }
        // in case we need another dot which is not there create it
        else if (!dot)
        {
          dot = document.createElement("div");
          dot.className = "amx-dottedPageControl_dot amx-filmStrip_pageControlButton";
          var chevron = document.createElement("div");
          chevron.className = "amx-filmStrip_pageControlButton-chevron";
          dot.appendChild(chevron);

          adf.mf.api.amx.addBubbleEventListener(dot, TOUCH_EVENTS["start"], createListener(realIndex));
          dots.appendChild(dot);
        }
        // apply selected style
        if (dot)
        {
          if (currentIndex === realIndex)
          {
            dot.classList.add("selected");
          }
          else
          {
            dot.classList.remove("selected");
          }
        }
      }

      forRemoval.forEach(function(node)
      {
        adf.mf.api.amx.removeDomNode(node);
      });
    }
  };

  dottedPageControl.prototype.refresh = function (amxNode, attributeChanges)
  {
    var parent = amxNode.getParent();
    if (!_isSupportedParent(parent))
    {
      return;
    }

    var typeHandler = parent.getTypeHandler();
    var rootElement = document.getElementById(amxNode.getId());

    var options = {
      'vertical': parent.getAttribute("orientation") === "vertical",
		  'pageCount': typeHandler.getPageCount(parent),
      'currentIndex': typeHandler.getCurrentPageIndex(parent),
      'lastGroupBehavior': amxNode.getAttribute("lastPageSetBehavior"),
      'dotsPerGroup': amxNode.getAttribute("dotsInPageSet"),
      'displayArrowLabels': amxNode.getAttribute("displayPageCount"),
      'on': {
        'pagechange': function(newPageIndex)
        {
          typeHandler.setCurrentPageByIndex(parent, newPageIndex, true);
        }
      }
		};

    _renderDottedPageControl(document.getElementById(amxNode.getId()), parent, options);
  };

  dottedPageControl.prototype.destroy = function (rootElement, amxNode)
  {
    var filmStrip = amxNode.getParent();
    filmStrip.setAttributeResolvedValue("_currentGroupIndex", null);
    filmStrip.setAttributeResolvedValue("_currentPosition", null);
    filmStrip.setAttributeResolvedValue("_prevGroupBehavior", null);
  };

  // ==== TODO replace with default API and remove this block of code ==== //
  var tapHoldPendingIds = {};

  function cancelPendingTapHold()
  {
    tapHoldPendingIds = {};
  }

  var holdThreshold = 800;

  var _addTapHoldEventListener = function (node, listenerAddCallback, listener, eventData)
  {
    eventData = eventData || {};

    var tapId = null;
    var startListener = function (event)
    {
      tapId = amx.uuid();// TODO don't use amx.foo!
      tapHoldPendingIds[tapId] = new Date().getTime();

      setTimeout(function ()
      {
        // Note: here we double check if the time is greater than the threshold. This is useful since sometime timeout
        //       is not really reliable.
        if (tapHoldPendingIds[tapId] > 0)
        {
          delete tapHoldPendingIds[tapId];
          // Call the listener but make sure our eventData is used:
          var eventDataToRestore = event.data;
          event.data = eventData;
          event.data.type = "tapHold";
          listener.call(node, event);
          event.data = eventDataToRestore;
        }
      },
      holdThreshold);
    };

    var endListener = function (event)
    {
      if (tapHoldPendingIds[tapId])
      {
        delete tapHoldPendingIds[tapId];

        var eventDataToRestore = event.data;
        event.data = eventData;
        event.data.type = "click";
        listener.call(node, event);
        event.data = eventDataToRestore;
      }
    };

    listenerAddCallback.call(this, startListener, endListener, cancelPendingTapHold);
  };
  // ==== end of block for removal ==== //

  /* -------------------- amx:filmStripItem --------------------- */
  /**
   * handler for the amx:filmStripItem tag that should be nested inside of the amx:filmStrip tag. It represents
   * one item of the filmStrip.
   */
  var filmStripItem = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "filmStripItem");

  filmStripItem.prototype.createChildrenNodes = function (amxNode)
  {
    // in case that the item is not visible return handled
    if (true === amxNode.getAttribute("_visible"))
    {
      // left the framework to create children nodes
      return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["NONE"];
    }
    // don't create anything since we are not visible 
    return adf.mf.api.amx.AmxNodeCreateChildrenNodesResult["HANDLED"];
  };

  /**
   *
   * @param amxNode filmStripItem amx node
   * @id id of current component
   * @return domElement div which represents one filmStrip item
   */
  filmStripItem.prototype.render = function (amxNode, id)
  {
    // atributes defined in xsd file
    var shortDesc = amxNode.getAttribute("shortDesc");
    var text = amxNode.getAttribute("text");
    // main container of the item
    var rootElement = document.createElement("div");
    if (shortDesc)
    {
      rootElement.setAttribute("title", shortDesc);
    }
    // set selected style if current item is selected
    var alreadySelected = _isSelectedRowKey(amxNode.getParent(), _getStampKey(amxNode));
    if (alreadySelected)
    {
      rootElement.classList.add("adfmf-filmStripItem-selected");
    }
    // content div contains all rendered descandants of current amx node.
    // content is flexible and should fill all available space in the root element.
    var content = document.createElement("div");
    content.id = id + "_content";
    if (false !== amxNode.getAttribute("_visible"))
    {
      var descendants = amxNode.renderDescendants();
      for (var i = 0; i < descendants.length;++i)
      {
        content.appendChild(descendants[i]);
      }
    }

    rootElement.appendChild(content);
    content.className = "amx-filmStrip-item-content";
    // if text attribute is defined then add new div and render
    // text inside
    // text element is inflexible so it will only fill minimal space necessary
    if (text)
    {
      var textContent = document.createElement("div");
      textContent.id = id + "_text";
      textContent.className = "amx-filmStrip-item-text";
      textContent.textContent = text;
      rootElement.appendChild(textContent);
    }
    // add default tap handler that triggers the action events and selection events
    adf.mf.api.amx.addBubbleEventListener(rootElement, "tap", this._handleTap,
    {
      "elementId" : id, "itemAmxNode" : amxNode
    });
    // return completed div
    return rootElement;
  };

  filmStripItem.prototype.refresh = function (amxNode, attributeChanges)
  {
    // handle inlineStyle and styleClass changes
    filmStripItem.superclass.refresh.call(this, amxNode, attributeChanges);
    var id = amxNode.getId();
    var rootElement = document.getElementById(id);

    if (attributeChanges.hasChanged("_visible") && false !== amxNode.getAttribute("_visible"))
    {
      var content = document.getElementById(id + "_content");
      var descendants = amxNode.renderDescendants();
      for (var i = 0; i < descendants.length; ++i)
      {
        content.appendChild(descendants[i]);
      }
    }

    if (attributeChanges.hasChanged("shortDesc"))
    {
      var shortDesc = amxNode.getAttribute("shortDesc");
      if (shortDesc)
      {
        rootElement.setAttribute("title", shortDesc);
      }
      else
      {
        rootElement.removeAttribute("title");
      }
    }

    if (attributeChanges.hasChanged("text"))
    {
      var text = amxNode.getAttribute("text");
      var textElement = document.getElementById(id + "_text");
      if (textElement)
      {
        if (text)
        {
          textContent.textContent = text;
        }
        else
        {
          adf.mf.api.amx.removeDomNode(textElement);
        }
      }
      else if (text)
      {
        textElement = document.createElement("div");
        textElement.id = id + "_text";
        textElement.className = "amx-filmStrip-item-text";
        textElement.textContent = text;
        rootElement.appendChild(textContent);
      }
    }
  };

  filmStripItem.prototype.attributeChangeResult = function(amxNode, attributeName, attributeChanges)
  {
    switch (attributeName)
    {
      case "_visible":
        // change visibility of the content
        // this is by default false and has to be 
        // set to true by parent
        if (true === amxNode.getAttribute("_visible"))
        {
          amxNode.createStampedChildren(null, null, null);
          amxNode.setAttributeResolvedValue("_visible", null);
        }
        else if (attributeChanges.getSize() === 1)
        {
          return adf.mf.api.amx.AmxNodeChangeResult["NONE"]; 
        }
        return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
      // following attributes are handled by the refresh function
      // of the filmStripItem handler
      case "shortDesc":
      case "text":
        return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
      default:
    }
    // all other changes are handled by parent handler
    return filmStripItem.superclass.attributeChangeResult.call(this, amxNode, attributeName, attributeChanges);
  };

  /**
   * Stores the rowKey of the selected filmStrip item.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   * @param {String} selectedRowKey null or the rowKey
   */
  var _storeSelectedRowKey = function (amxNode, selectedRowKey)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData == null)
    {
      storedData = {};
    }

    if (!storedData["selectedRowKeys"])
    {
      storedData["selectedRowKeys"] = {};
    }

    selectedRowKey = selectedRowKey.trim ? selectedRowKey.trim() : selectedRowKey;
    storedData["selectedRowKeys"][selectedRowKey] = selectedRowKey;

    amxNode.setVolatileState(storedData);
  };

  /**
   * Removes the rowKey of the selected filmStrip item.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   * @param {String} selectedRowKey null or the rowKey
   */
  var _removeSelectedRowKey = function (amxNode, selectedRowKey)
  {
    selectedRowKey = selectedRowKey.trim();
    var storedData = amxNode.getVolatileState();
    if (storedData != null && storedData["selectedRowKeys"])
    {
      delete storedData["selectedRowKeys"][selectedRowKey];
      amxNode.setVolatileState(storedData);
    }
  };

  /**
   * Removes the rowKey of the selected filmStrip item.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   * @param {String} selectedRowKey null or the rowKey
   */
  var _isSelectedRowKey = function (amxNode, selectedRowKey)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData != null && storedData["selectedRowKeys"])
    {
      if (storedData["selectedRowKeys"][selectedRowKey])
      {
        return true;
      }
    }
    return false;
  };

  /**
   * Retrieves null or the rowKeys from filmStrip.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   * @return {array<String>} the array of rowKeys
   */
  var _getSelectedRowKeys = function (amxNode)
  {
    var storedData = amxNode.getVolatileState();
    var result = [];
    if (storedData != null && storedData["selectedRowKeys"])
    {
      for (var key in storedData["selectedRowKeys"])
      {
        result.push(key);
      }
    }
    return result;
  };

  /**
   * Removes all rowKeys.
   * @param {Object} amxNode the amxNode for this filmStrip instance
   */
  var _removeAllSelectedRowKeys = function (amxNode)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData != null)
    {
      delete storedData["selectedRowKeys"];
      amxNode.setVolatileState(storedData);
    }
  };

  /**
   * Default handler that processes the tap event on the item's container.
   * @param event {Event} tap event
   */
  filmStripItem.prototype._handleTap = function (event)
  {
    // don"t propagate events to parent container to prevent deselection since
    // the tap on the parent container triggers the empty selection event.
    event.stopPropagation();

    var itemElementId = event.data["elementId"];
    var itemElement = document.getElementById(itemElementId);
    var itemAmxNode = event.data["itemAmxNode"];
    var filmStripAmxNode = itemAmxNode.getParent();
    // create action event and process it
    adf.mf.api.amx.validate(itemElement, function ()
    {
      if (adf.mf.api.amx.acceptEvent())
      {
        var amxEvent = new adf.mf.api.amx.ActionEvent();
        adf.mf.api.amx.processAmxEvent(itemAmxNode, "action", undefined, undefined, amxEvent, null);
      }
    });
    // create selection event and process it
    if (adf.mf.api.amx.acceptEvent())
    {
      var selectionType = filmStripAmxNode.getAttribute("selection");
      // process selection only when selection mode is single or multiple
      if (selectionType === "single" || selectionType === "multiple")
      {
        // rowKey of this filmStripItem
        var newSelectedRowKey = _getStampKey(itemAmxNode);
        // get current selection to preserve it
        var oldSelection = _getSelectedRowKeys(filmStripAmxNode);
        // check if current row is selected and decide if this item should be selected or deselected
        var alreadySelected = _isSelectedRowKey(filmStripAmxNode, newSelectedRowKey);
        if (selectionType === "single")
        {
          // in case of the single selection clear previous selection
          var filmStripElement = document.getElementById(filmStripAmxNode.getId());
          var selectedItems = filmStripElement.querySelectorAll(".adfmf-filmStripItem-selected");
          if (selectedItems)
          {
            for (var i = 0; i < selectedItems.length; i++)
            {
              selectedItems[i].classList.remove("adfmf-filmStripItem-selected");
            }
          }
          _removeAllSelectedRowKeys(filmStripAmxNode);
        }
        else if (alreadySelected === true)
        {
          // if this is multiple selection and item is selected then only remove selection from this item
          itemElement.classList.remove("adfmf-filmStripItem-selected");
          _removeSelectedRowKey(filmStripAmxNode, newSelectedRowKey);
        }

        if (alreadySelected === false)
        {
          // add item into the selection when item is not selected
          itemElement.classList.add("adfmf-filmStripItem-selected");
          _storeSelectedRowKey(filmStripAmxNode, newSelectedRowKey);
        }
        // generate current selection and create selection event
        var selection = _getSelectedRowKeys(filmStripAmxNode);
        var selectionEvent = new adf.mf.api.amx.SelectionEvent(oldSelection, selection);
        // process this event via amx
        adf.mf.api.amx.processAmxEvent(filmStripAmxNode, "selection", undefined, undefined, selectionEvent);
      }
    }
  };

  /* ---------------- FilmStripPageChangeEvent -------------------*/
  var FilmStripPageChangeEvent = function (displayedPageIndex, pageCount, itemsPerPage, displayedItemsPerPage)
  {
    this[".type"] = "oracle.adfmf.amx.event.FilmStripPageChangeEvent";
    this["displayedPageIndex"] = displayedPageIndex;
    this["pageCount"] = pageCount;
    this["displayedItemsPerPage"] = displayedItemsPerPage;
    this["itemsPerPage"] = itemsPerPage;
  };

  /* ---------------------- amx:filmStrip ----------------------- */

  var filmStrip = adf.mf.api.amx.TypeHandler.register(adf.mf.api.amx.AmxTag.NAMESPACE_AMX, "filmStrip");

  filmStrip.prototype.createChildrenNodes = function (amxNode)
  {
    var variableName = amxNode.getAttribute("var");
    var dataItems = null;
    // if value attribute is defined try to get
    // collection from it
    if (variableName && amxNode.isAttributeDefined("value"))
    {
      dataItems = amxNode.getAttribute("value");
    }
    // verify that all required properties are ready
    if (dataItems === undefined)
    {
      // Mark it so the framework knows that the children nodes cannot be
      // created until the collection model has been loaded
      amxNode.setState(adf.mf.api.amx.AmxNodeStates["INITIAL"]);
      return true;
    }
    else if (dataItems)
    {
      var iter = adf.mf.api.amx.createIterator(dataItems);
      // See if all the rows have been loaded, if not, force the necessary
      // number of rows to load and then build this node's children
      if (iter.getTotalCount() > iter.getAvailableCount())
      {
        adf.mf.api.amx.showLoadingIndicator();
        adf.mf.api.amx.bulkLoadProviders(dataItems, 0, -1, function ()
        {
          try
          {
            // Call the framework to have the new children nodes constructed.
            var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
            args.setAffectedAttribute(amxNode, "value");
            adf.mf.api.amx.markNodeForUpdate(args);
          }
          finally
          {
            adf.mf.api.amx.hideLoadingIndicator();
          }
        },
        function (message, resp)
        {
          adf.mf.api.adf.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE,
            "amx:filmStrip.createChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR");

          // Only log the details at a fine level for security reasons
          if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.FINE))
          {
            adf.mf.log.Framework.logp(adf.mf.log.level.FINE,
              "amx:filmStrip", "createChildrenNodes",
              "Request: " + message + " response: " + resp);
          }

          adf.mf.api.amx.hideLoadingIndicator();
        });
      }

      while (iter.hasNext())
      {
        iter.next();
        _buildChildren(amxNode, iter.getRowKey());
      }
    }
    else
    {
      _buildChildren(amxNode, null);
    }

    amxNode.createStampedChildren(null, [ "pageControl" ]);

    amxNode.setState(adf.mf.api.amx.AmxNodeStates["ABLE_TO_RENDER"]);
    return true;
  };

  /**
   * @param amxNode
   * @return stamp key from collection model or virtual stamp in case
   *         that there is no collection
   */
  var _getStampKey = function(amxNode)
  {
    var stampKey = amxNode.getStampKey();
    if (stampKey == null)
    {
      stampKey = amxNode.getAttribute("_virtualStamp");
    }
    return stampKey || null;
  };

  var _buildChildren = function(amxNode, rowKey)
  {
    var created = amxNode.createStampedChildren(rowKey, null, null);
    // tell the children not to render its content since it is not
    // yet visible, otherwise we get an error in DT preview browser
    if (!adf.mf.environment.profile.dtMode)
    {
      created.forEach(function(childAmxNode, index)
      {
        childAmxNode.setAttributeResolvedValue("_visible", false);
        if (rowKey == null)
        {
          // use ID of the child amxNode or index if ID is not set
          // ID attribute is not EL bounded so we can use literal expression from 
          // AmxNode#getAttributeExpression function
          childAmxNode.setAttributeResolvedValue("_virtualStamp", childAmxNode.getAttributeExpression("id", true) || ("" + index));
        }
      });
    }

    return created;
  };

  filmStrip.prototype.visitChildren = function (amxNode, visitContext, callback)
  {
    if (amxNode.visitStampedChildren(null, ["pageControl"], null, visitContext, callback))
    {
      return true;
    }
    var dataItems = amxNode.getAttribute("value");
    var variableName = amxNode.getAttribute("var");
    var iter = dataItems ? adf.mf.api.amx.createIterator(dataItems) : null;
    // visit only visitable children
    if (!visitContext.isVisitAll())
    {
      var nodesToWalk = visitContext.getChildrenToWalk(amxNode);
      for (var i = 0; i < nodesToWalk.length; i++)
      {
        var variableSet = false;
        var stampKey = nodesToWalk[i].getStampKey();
        if (iter && stampKey != null)
        {
          if (!iter.setCurrentRowKey(stampKey))
          {
            continue;
          }

          var current = null;
          if (iter.isTreeNodeIterator())
          {
            current = dataItems.localFetch(dataItems.getCurrentIndex());
          }
          else
          {
            current = iter.getCurrent();
          }

          if (!current)
          {
            continue;
          }

          adf.mf.el.pushVariable(variableName, current);
          variableSet = true;
        }

        try 
        {
          if (nodesToWalk[i].visit(visitContext, callback))
          {
            return true;
          }
        }
        finally 
        {
          if (variableSet)
          {
            adf.mf.el.popVariable(variableName);
          }
        }
      }
      return false;
    }

    if (iter)
    {
      while (iter.hasNext())
      {
        var item = iter.next();
        adf.mf.el.pushVariable(variableName, item);
        try
        {
          if (amxNode.visitStampedChildren(iter.getRowKey(), [null], null, visitContext, callback))
          {
            return true;
          }
        }
        finally
        {
          adf.mf.el.popVariable(variableName);
        }
      }

      return false;
    }
    else
    {
      return amxNode.visitStampedChildren(null, [null], null, visitContext, callback);
    }
  };

  filmStrip.prototype.attributeChangeResult = function(amxNode, attributeName, attributeChanges)
  {
    amxNode.setAttributeResolvedValue("_pageChangeCause", null);
    switch (attributeName)
    {
      case "value":
        return this._updateCollectionModel(amxNode, attributeChanges);
      // following attributes are handled by the refresh function
      // of the filmStrip handler
      case "displayedItemKey":
      case "displayedPageIndex":
        // set cause of the page change to allow page mechanism
        // to set proper current page based on these two attributes
        // this is necessary when both are used simultaneously
        amxNode.setAttributeResolvedValue("_pageChangeCause", attributeName);
        // refresh filmStrip
        return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
      case "halign":
      case "itemSizing":
      case "itemsPerPage":
      case "orientation":
      case "pageControlPosition":
      case "shortDesc":
      case "valign":
        // all these attributes support refresh
        return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
      default:
    }
    // all other changes are handled by parent handler
    return filmStrip.superclass.attributeChangeResult.call(this, amxNode, attributeName, attributeChanges);
  };

  filmStrip.prototype.getDescendentChangeAction = function (amxNode, changes)
  {
    // marked nodes with rendered false attribute as not visible
    changes.getAffectedNodes().forEach(function(node)
    {
      if (false === node.getAttribute("rendered"))
      {
        node.setAttributeResolvedValue("_visible", false);
      }
    });

    return adf.mf.api.amx.AmxNodeChangeResult["RERENDER"];
  };

  /**
   * Function used by the filmStrip to process the attributeChangeResult response to collection
   * model changes
   * @param {adf.mf.api.amx.AmxNode} amxNode the AmxNode that has been updated
   * @param {adf.mf.api.amx.AmxAttributeChange} attributeChanges the information regarding what attributes
   *        were changed and how they changed
   */
  filmStrip.prototype._updateCollectionModel = function (amxNode, attributeChanges)
  {
    // process change in the collection model
    var dataItems = amxNode.getAttribute("value");
    var collectionChange = attributeChanges.getCollectionChange("value");
    // no dataitems or non itemized change => replace whole filmStrip
    if (!dataItems || !collectionChange || !collectionChange.isItemized())
    {
      return adf.mf.api.amx.AmxNodeChangeResult["REPLACE"];
    }

    var iter = adf.mf.api.amx.createIterator(dataItems);
    // reload providers if needed
    // this is mostly in case that some of the 
    // providers are dirtied and removed from 
    // collection model
    if (iter.getTotalCount() > iter.getAvailableCount())
    {
      adf.mf.api.amx.showLoadingIndicator();
      adf.mf.api.amx.bulkLoadProviders(dataItems, 0, -1, function ()
      {
        try
        {
          // pass the same information for secondary processing
          // when all providers are properly loaded
          var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
          args.setAffectedAttribute(amxNode, "value");
          args.setCollectionChanges(amxNode.getId(), "value", collectionChange);
          // fire update of the nodes changed in previous section
          adf.mf.api.amx.markNodeForUpdate(args);
        }
        finally 
        {
          adf.mf.api.amx.hideLoadingIndicator();
        }
      },
      function (message, resp)
      {
        adf.mf.api.adf.logInfoResource("AMXInfoBundle", adf.mf.log.level.SEVERE,
          "amx:filmStrip.createChildrenNodes", "MSG_ITERATOR_FIRST_NEXT_ERROR");

        // Only log the details at a fine level for security reasons
        if (adf.mf.log.Framework.isLoggable(adf.mf.log.level.FINE))
        {
          adf.mf.log.Framework.logp(adf.mf.log.level.FINE,
            "amx:filmStrip", "createChildrenNodes",
            "Request: " + message + " response: " + resp);
        }

        adf.mf.api.amx.hideLoadingIndicator();
      });
      // set flag that we need to load data
      attributeChanges.setCustomValue("bulkLoad", true);
      // do nothing since we are waiting for data
      return adf.mf.api.amx.AmxNodeChangeResult["NONE"];
    }

    var hasChanges = false;
    // this object contains information about all changed AmxNodes
    // which are direct children of the filmStrip
    var changes = {
      "deleted" : [],
      "replaced" : [],
      "created": []
    };
    // remove AmxNodes for deleted keys and 
    // add these nodes into the temporary
    // info object
    var deletedKeys = collectionChange.getDeletedKeys();
    deletedKeys.forEach(function(key)
    {
      var removed = amxNode.removeChildrenByKey(key);
      changes["deleted"] = changes["deleted"].concat(removed);
    });
    // create new AmxNodes for all the newly created keys
    // and store them in temporary info object
    var createdKeys = collectionChange.getCreatedKeys();
    createdKeys.forEach(function(key)
    {
      hasChanges = true;
      var created = _buildChildren(amxNode, key);
      changes["created"] = changes["created"].concat(created);
    });
    // replace all the updated/dirtied
    // nodes since we don't now which properties
    // have changed
    // store them in temporary info object
    var updatedKeys = collectionChange.getUpdatedKeys();
    updatedKeys = updatedKeys.concat(collectionChange.getDirtiedKeys());

    updatedKeys.forEach(function(key)
    {
      hasChanges = true;
      amxNode.removeChildrenByKey(key);
      var replaced = amxNode.createStampedChildren(key, null, null);
      replaced.forEach(function(childAmxNode)
      {
        childAmxNode.setAttributeResolvedValue("_visible", true);
      });
      changes["replaced"] = changes["replaced"].concat(replaced);
    });

    if (!hasChanges)
    {
      return adf.mf.api.amx.AmxNodeChangeResult["NONE"];
    }
    else
    {
      attributeChanges.setCustomValue("amxNodeCollectionChanges", changes);
    }
    // in all other cases refresh whole component
    return adf.mf.api.amx.AmxNodeChangeResult["REFRESH"];
  };

  function _getEventPagePosition(e)
  {
    var pageX, pageY;
    if (e.touches && e.touches.length > 0)
    {
      pageX = e.touches[0].pageX;
      pageY = e.touches[0].pageY;
    }
    else
    {
      pageX = e.pageX;
      pageY = e.pageY;
    }

    return {
      "x": pageX,
      "y": pageY
    };
  };

  /**
   * creates drag and tap handlers for the filmStrip
   *
   * @param amxNode filmStripAmxNode
   * @domElement root element that requires these handlers
   */
  filmStrip.prototype._createHandlers = function (aNode, domElement)
  {
    /**
     * Time value in ms that represents border between swipe and drag event
     */
    var SWIPE_THRESHOLD_MS = 200;

    /**
     * relative distance in percents that has to be traveled by the finger 
     * on screen to evaluate this event as a swipe.
     */
    var SWIPE_THRESHOLD_REL_DIST = 10;

    /**
     * relative distance in percents that has to be traveled by the finger 
     * on screen to evaluate this event as a page changing event.
     */
    var PAGECHANGE_THRESHOLD_REL_DIST = 50;

    /**
     * direction ofset in degrees
     */
    var DRAG_DIRECTION_OFFSET = 40;

    var c = this.getPageCount(aNode);
    var dragcontext = { 
      "origin" : null, 
      "startTime" : null, 
      "vertical" : aNode.getAttribute("orientation") === "vertical",
      "pageCount" : c };
      
    // lock the first position of the touch
    // we need to do it separately to prevent unwanted jump on the real drag start
    var that = this;
    adf.mf.api.amx.addBubbleEventListener(domElement, TOUCH_EVENTS["start"], function(event)
    {
      // keep origin of the drag
      dragcontext["origin"] = _getEventPagePosition(event);
      // disable animations since position of the pages has to be updated immediately
      enableAnimation(this.childNodes, false);

      // store temporary information about the screen size
      if (dragcontext["vertical"])
      {
        dragcontext["baseSize"] = this.childNodes[0].offsetHeight;
      }
      else
      {
        dragcontext["baseSize"] = this.childNodes[0].offsetWidth;
      }
      dragcontext["activePageIndex"] = that.getCurrentPageIndex(aNode);
    });
    // enable animations as soon as the touch ends
    // it is in separate listener to prevent loosing the animation in case that the 
    // drag end is not called or drag doesn't even start
    adf.mf.api.amx.addBubbleEventListener(domElement, TOUCH_EVENTS["end"], function(event)
    {
      enableAnimation(this.childNodes, true);
    });

    adf.mf.api.amx.addDragListener(domElement,
    {
      "threshold" : 0,
      "start" : function (event, dragExtra)
      {
        event.stopPropagation();
        event.preventDefault();
        dragExtra.preventDefault = true;
        dragExtra.stopPropagation = true;

        dragExtra.requestDragLock(this, true, true);

        var context = event.data["context"];
        // start time of the event to filter swipe event
        context["startTime"] = Date.now();
        context['swipeFound'] = 0;
        // prepare last change property that contains information about current change
        context["lastChange"] = null;
        context["swipeStart"] = null;
      },
      "drag": function (event, dragExtra)
      {
        event.stopPropagation();
        event.preventDefault();
        dragExtra.stopPropagation = true;

        var context = event.data["context"];
        // verify direction of the swipe event
        if (isSupportedDirection(context, dragExtra, DRAG_DIRECTION_OFFSET))
        {
          dragExtra.preventDefault = true;
        }
        // detect swipe during the motion
        // [delta is length between two drag events]
        var delta = Math.abs(context["vertical"] ? dragExtra.deltaPageY : dragExtra.deltaPageX);
        if (context["delta"])
        {
          // in case of extraordinary acceleration register countdown for the swipe detection
          // the expectation is that the delta is two times bigger than the previous one and 
          // drag drag will end in the following 200 ms
          if (context["delta"] < delta / 2)
          {
            context["swipeFound"] = true;// magic number is the 
            context["swipeStart"] = Date.now();
          }
          else if (context["swipeFound"])
          {
            var duration = Date.now() - context["swipeStart"];
            if (duration > SWIPE_THRESHOLD_MS)
            {
              // decrease the number of iterations left
              context["swipeFound"] = false;
              context["swipeStart"] = null;
            }
          }
        }

        context["delta"] = delta;
        // inititial values for deceleration
        var velocity = 0.7;
        var deceleration = 0;
        var amxNode = event.data["amxNode"];
        // when duration is longer than 150ms than it is not swipe so we can drag pages
        var change = getRelativeChange(amxNode, context, dragExtra);
        // store lastChange to be used in the end function
        context["lastChange"] = change;
        // get meta info about pages
        var activePageIndex = context["activePageIndex"];
        var count = context["pageCount"];

        if ((activePageIndex === 0 && change > 0) || (count - 1 === activePageIndex && change < 0))
        {
          // in case that selected page is border page then add deceleration to simulate resistance
          deceleration = change * velocity;
        }
        var value = activePageIndex * -100 + change - deceleration;
        // set transformation to all pages
        setDragTransformation(amxNode, this.childNodes, context["vertical"], (Math.floor(value * 100)) / 100);
      },
      "end": function (event, dragExtra)
      {
        event.stopPropagation();
        event.preventDefault();
        event.stopPropagation();
        event.preventDefault();

        var context = event.data["context"];
        var duration = Date.now() - context["startTime"];
        var amxNode = event.data["amxNode"];
        // enable animations to achieve smooth transition to the nearest boundary
        enableAnimation(this.childNodes, true);
        // try to obtain change - usefull for the drag on the iOS where
        // the dragExtra doen't contain proper pageX and pageY properties 
        // in some cases
        var change = context["lastChange"];
        if (!change)
        {
          // swipe - calculate new change since this is not handled in the drag function
          change = getRelativeChange(amxNode, context, dragExtra);
        }
        if (change !== 0)
        {
          var renderer = event.data["renderer"];

          var activePageIndex = context["activePageIndex"];
          var indexChange = 0;

          if (context["swipeFound"] === true || (duration > SWIPE_THRESHOLD_MS && Math.abs(change) > PAGECHANGE_THRESHOLD_REL_DIST) 
          // last longer than 150ms so it is not swipe and it should be longer than 50% of the screen
           || (duration <= SWIPE_THRESHOLD_MS && Math.abs(change) > SWIPE_THRESHOLD_REL_DIST 
             && isSupportedDirection(context, dragExtra, DRAG_DIRECTION_OFFSET))) // verify direction of the swipe
          {
            // in case the swipe is detected only find direction of the swipe and
            // move to the previous or the next page
            indexChange = ( - 1) * (change / (Math.abs(change)));
          }
          renderer.setCurrentPageByIndex(amxNode, activePageIndex + indexChange);
        }
      }
    },
    {
      "amxNode" : aNode,
      "context" : dragcontext,
      "renderer" : this
    });
    // add tap listnere for selection removal
    adf.mf.api.amx.addBubbleEventListener(domElement, "tap", this._handleTap,
    {
      "amxNode" : aNode
    });
    // clean context to prevent reference to the dom from closure
    domElement = null;
  };

  /**
   * @return relative change base on the origin of the drag and current position of a thumb
   */
  var getRelativeChange = function (amxNode, context, dragExtra)
  {
    if (context["origin"])
    {
      var change;
      if (context["vertical"])
      {
        change = (dragExtra.pageY - context["origin"]["y"]);
      }
      else
      {
        change = (dragExtra.pageX - context["origin"]["x"]);
      }
      // change direction of change in rtl mode
      if (__isRTL(amxNode))
      {
        change = (-1) * change;
      }
      // get relative change
      return change / context["baseSize"] * 100;
    }
    return 0;
  }

  /**
   * @return true in case that the drag is in right direction
   */
  var isSupportedDirection = function (context, dragExtra, offset)
  {
    return context["vertical"] ? 
       Math.abs(Math.abs(dragExtra.originalAngle) - 90) < offset : 
       Math.abs(Math.abs(Math.abs(dragExtra.originalAngle) - 90) - 90) < offset;
  }

  /**
   * default handler for the tap event on filmStrip that removes the selection
   */
  filmStrip.prototype._handleTap = function (event)
  {
    if (adf.mf.api.amx.acceptEvent())
    {
      var filmStripAmxNode = event.data["amxNode"];
      var selectionType = filmStripAmxNode.getAttribute("selection");
      if (selectionType === "single" || selectionType === "multiple")
      {
        var oldSelection = _getSelectedRowKeys(filmStripAmxNode);
        var filmStripElement = document.getElementById(filmStripAmxNode.getId());
        // get all selected nodes and remove all class for selected items
        var selectedItems = filmStripElement.querySelectorAll(".adfmf-filmStripItem-selected");
        if (selectedItems)
        {
          for (var i = 0;i < selectedItems.length;i++)
          {
            selectedItems[i].classList.remove("adfmf-filmStripItem-selected");
          }
        }
        // clear information about selected row keys
        _removeAllSelectedRowKeys(filmStripAmxNode);
        // fire new selection event with empty selection
        var selectionEvent = new adf.mf.api.amx.SelectionEvent(oldSelection, []);
        adf.mf.api.amx.processAmxEvent(filmStripAmxNode, "selection", undefined, undefined, selectionEvent);
      }
    }
  };

  /**
   * function sets animation class name to the array of the dom elements.
   * @param elements array of the dom nodes
   * @param animation specifies if the animation should be enabled or not (values true/false)
   */
  var enableAnimation = function (pages, animation)
  {
    var styleClass = "amx-filmStrip_page";
    if (animation === true)
    {
      styleClass += " animation";
    }

    for (var i = 0, size = pages.length; i < size; i++)
    {
      if (pages[i].className === styleClass)
      {
        continue;
      }
      pages[i].className = styleClass;
    }
  };

  /**
   * @returns true in case that we have to use RTL mode.
   */
  var __isRTL = function(amxNode)
  {
    // rtl doesn't matter for the vertical orientation
    if (amxNode.getAttribute("orientation") === "vertical")
    {
      return false;
    }
    // get orientation from the document
    return document.documentElement.dir == "rtl";
  };

  /**
   * sets webkit transformation to the array of elements
   *
   * @param elements array of the dom nodes
   * @param vertical Y-axis transformation if true, X-axis transformation otherwise
   * @param value new position in pixels
   */
  var setDragTransformation = function (amxNode, elements, vertical, value)
  {
    if (__isRTL(amxNode))
    {
      // change direction in rtl mode
      value = (-1) * value;
    }

    value = value + "%";
    // let the browser decide the best time to set the transformation
    // to the elements
    var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
    if (raf)
    {
      var rafId = amxNode.getAttribute('_rafid');
      if (rafId)
      {
        var caf = window.cancelAnimationFrame || window.webkitCancelAnimationFrame;
        if (caf)
        {
          // cancel previous frame if this frame is not yet rendered
          caf(rafId);
          rafId = null;
        }
      }
      // create new animation frame with callback that sets new transformation
      rafId = raf(function(timestamp)
      {
        __setTransformation(elements, vertical, value);
        elements = null;
        amxNode.setAttributeResolvedValue('_rafid', null);
      });
      // store new id of the animation frame
      amxNode.setAttributeResolvedValue('_rafid', rafId);
    }
    else
    {
      __setTransformation(elements, vertical, value);
      elements = null;
    }
  };

  /**
   * real method that performs setting of the transformation to the pages
   *
   * @param elements array of the dom nodes
   * @param vertical Y-axis transformation if true, X-axis transformation otherwise
   * @param value new position in pixels
   */
  var __setTransformation = function (elements, vertical, value)
  {
    var tfn = vertical ? "translateY" : "translateX";
    for (var i = 0, length = elements.length; i < length; i++)
    {
      if (elements[i].style.transform !== undefined)
      {
        elements[i].style.transform = tfn + "(" + value + ")";
      }
      else
      {
        elements[i].style.WebkitTransform = tfn + "(" + value + ")";
      }
    }
  };

  /**
   * adds meta information about page and its position
   * @param amxNode filmStripAmxNode
   * @param position position of the page on the X/Y-axis
   * @param id identificator of the page
   */
  filmStrip.prototype.setPageCount = function (amxNode, value)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData == null)
    {
      storedData = {};
    }

    storedData["_pageCount"] = value;

    amxNode.setVolatileState(storedData);
  }

  var _getPageCount = function (amxNode)
  {
    var storedData = amxNode.getVolatileState();
    if (storedData == null || !storedData["_pageCount"])
    {
      return 0;
    }

    return storedData["_pageCount"];
  };

  /**
   * @param amxNode filmStripAmxNode
   * @return number of pages available
   */
  filmStrip.prototype.getPageCount = _getPageCount;

  /**
   * @param amxNode filmStripAmxNode
   * @return index of the displayed page
   */
  filmStrip.prototype.getCurrentPageIndex = function (amxNode)
  {
    var page = _getPageFromClientState(amxNode);
    return page ? page : 0;
  };

  /**
   * sets the index of the page that should be made visible
   *
   * @param amxNode filmStripAmxNode
   * @param index of page where to go
   */
  filmStrip.prototype.setCurrentPageByIndex = function (amxNode, index, animate)
  {
    // get valid index
    var pageCount = this.getPageCount(amxNode);
    if (!index)
    {
      index = 0;
    }
    else
    {
      index = Math.max(index, 0);
      index = Math.min(index, pageCount - 1);
    }

    // store information about newly selected index
    _storePageState(amxNode, index);

    var id = amxNode.getId();
    // get pagecontrol and update its state
    this._refreshPageControl(amxNode);
    // detect orientation and sets the transformation of the pages
    var orientation = amxNode.getAttribute("orientation");
    var pages = document.getElementById(id + "_pageContainer");
    if (!pages)
    {
      return;
    }
    if (animate != null)
    {
      enableAnimation(pages.childNodes, animate);
    }
    // set the proper transformation to the pages
    // do it anytime to prevent remains of drag behavior
    setDragTransformation(amxNode, pages.childNodes, orientation === "vertical", (index * -100));

    var args = null;
    var offset = 1;
    for (var idx = Math.max(index - offset, 0), last = Math.min(index + offset, pageCount - 1); idx <= last; idx++)
    {
      var page = pages.childNodes[idx];
      if (!page)
      {
        continue;
      }

      var items = page.childNodes;

      for (i = 0; i < items.length; i++)
      {
        var childAmxNode = adf.mf.internal.amx._getNonPrimitiveElementData(items[i], "amxNode");
        if (childAmxNode)
        {
          if (false !== childAmxNode.getAttribute("_visible"))
          {
            continue;
          }

          if (args === null)
          {
            args = new adf.mf.api.amx.AmxNodeUpdateArguments();
          }

          childAmxNode.setAttributeResolvedValue("_visible", true);
          args.setAffectedAttribute(childAmxNode, "_visible");
        }
      }
    }

    if (args !== null)
    {
      adf.mf.api.amx.markNodeForUpdate(args);
    }

    var currentIndex = amxNode.getAttribute("__currentPage");
    if (currentIndex === index)
    {
      // no further steps are required in case we are on the same index
      return;
    }

    // keep temp info about current page
    amxNode.setAttributeResolvedValue("__currentPage", index);
    // fire event to notify backend about page change
    if (adf.mf.api.amx.acceptEvent())
    {
      var currentNumberOfItemsPerPage = 0;
      if (pages.childNodes[index] && pages.childNodes[index].firstElementChild)
      {
         var item = pages.childNodes[index].firstElementChild;
         while (item)
         {
           if (!item.classList.contains("amx-empty"))
           {
             currentNumberOfItemsPerPage++;
           }
           item = item.nextElementSibling;
         }
      }
      var pageChangeEvent = new FilmStripPageChangeEvent(index, pageCount, amxNode.getAttribute("__itemsPerPage"), currentNumberOfItemsPerPage);
      adf.mf.api.amx.processAmxEvent(amxNode, "pageChange", undefined, undefined, pageChangeEvent, null);
    }
  };

  /**
   * parses selectedRowKeys attribute and prepares initial selection state.
   *
   * @param amxNode filmStripAmxNode
   */
  var _processInitialSelection = function (amxNode)
  {
    // remove current selection
    _removeAllSelectedRowKeys(amxNode);
    // in case that selection type is not single or multiple do nothing
    var selectionType = amxNode.getAttribute("selection");
    if (selectionType !== "single" && selectionType !== "multiple")
    {
      return;
    }
    // get initial set of rowKeys
    var selection = amxNode.getAttribute("selectedRowKeys");
    if (!selection)
    {
      return;
    }
    // parse selection in case that it is in a string format
    if (typeof selection === "string")
    {
      if (selection.indexOf(",") >  - 1)
      {
        selection = selection.split(",");
      }
      else if (selection.indexOf(" ") >  - 1)
      {
        selection = selection.split(" ");
      }
      else
      {
        selection = [selection];
      }
    }
    else if (typeof selection === "number")
    {
      selection = [selection];
    }
    // store all the rowkeys from the selection into the component"s state
    var iter = adf.mf.api.amx.createIterator(selection);
    while (iter.hasNext())
    {
      _storeSelectedRowKey(amxNode, iter.next());
    }
  };

  /**
   * @param amxNode filmStripAmxNode
   * @param rootElement filmStrip dom element
   * @param pageControlPosition position of the page control
   */
  filmStrip.prototype._renderPageControl = function (amxNode, rootElement)
  {
    var orientation = amxNode.getAttribute("orientation");
    var pageControlPosition = amxNode.getAttribute("pageControlPosition");
    var id = amxNode.getId();
    // get pageControl element if exists
    var pageControl = document.getElementById(id + "_pageControl");
    // remove this element
    if (pageControl)
    {
      adf.mf.api.amx.removeDomNode(pageControl);
    }

    var controlComponents = amxNode.getChildren("pageControl");
    var count = controlComponents.length;
    controlComponents = amxNode.getRenderedChildren("pageControl");

    if (pageControlPosition !== "none" && (count === 0 || controlComponents.length > 0))
    {
      // prepare proper default values
      orientation = (orientation !== "vertical" ? "horizontal" : "vertical")
      // create combination
      var combinations = orientation + "_" + pageControlPosition;

      if (!pageControl)
      {
        pageControl = document.createElement("div");
        pageControl.id = id + "_pageControl";
      }

      switch (combinations)
      {
        case "vertical_start":
        case "vertical_insideStart":
        case "horizontal_top":
        case "horizontal_insideTop":
          rootElement.insertBefore(pageControl, rootElement.firstElementChild);
          break;
        case "vertical_end":
        case "vertical_insideEnd":
        case "horizontal_bottom":
        case "horizontal_insideBottom":
          rootElement.appendChild(pageControl);
          break;
        default:
          pageControlPosition = (orientation === "vertical" ? "end" : "bottom");
          rootElement.appendChild(pageControl);
      }

      pageControl.className = "amx-filmStrip_pageControl position-" + pageControlPosition;
      // find any children of pageControl facet
      
      if (controlComponents.length > 0)
      {
        // render only components with rendered attribute on
        controlComponents.forEach(function(cc)
        {
          if (cc && cc.render)
          {
            pageControl.appendChild(cc.render());
          }
        });
      }
      else
      {
        var typeHandler = this;
        var options = {
          'vertical': orientation === "vertical",
          'pageCount': typeHandler.getPageCount(amxNode),
          'currentIndex': typeHandler.getCurrentPageIndex(amxNode),
          'on': {
            'pagechange': function(newPageIndex)
            {
              typeHandler.setCurrentPageByIndex(amxNode, newPageIndex, true);
            }
          }
        };

        _renderDottedPageControl(pageControl, amxNode, options);
      }
    }
    else
    {
      pageControl = null;
    }

    return pageControl;
  };

  var _markForRefresh = function(amxNode, controlComponents)
  {
    var args = new adf.mf.api.amx.AmxNodeUpdateArguments();
    var hasHit = true;

    controlComponents.forEach(function(cc)
    {
      var th = cc.getTypeHandler();
      if (adf.mf.internal.amx.implementsFunction(th, "__getRefreshProperty"))
      {
        hasHit = true;
        args.setAffectedAttribute(cc, th.__getRefreshProperty());
      }
    });

    if (hasHit)
    {
      adf.mf.api.amx.markNodeForUpdate(args);
    }
  };

  filmStrip.prototype._refreshPageControl = function(amxNode, attributeChanges)
  {
    var id = amxNode.getId();
    // get pageControl element if exists
    var pageControl = document.getElementById(id + "_pageControl");

    if (attributeChanges && attributeChanges.hasChanged("pageControlPosition"))
    {
      // reset current position
      amxNode.setAttributeResolvedValue("_currentPosition", null);
      // rerender pageControl completely
      this._renderPageControl(amxNode, document.getElementById(id));
      return;
    }

    var controlComponents = amxNode.getChildren("pageControl");
    if (controlComponents && controlComponents.length > 0)
    {
      controlComponents = amxNode.getRenderedChildren("pageControl");
      _markForRefresh(amxNode, controlComponents);
    }
    else
    {
      var typeHandler = this;
      var options = {
        'vertical': amxNode.getAttribute("orientation") === "vertical",
        'pageCount': typeHandler.getPageCount(amxNode),
        'currentIndex': typeHandler.getCurrentPageIndex(amxNode),
        'on': {
          'pagechange': function(newPageIndex)
          {
            typeHandler.setCurrentPageByIndex(amxNode, newPageIndex, true);
          }
        }
      };

      _renderDottedPageControl(pageControl, amxNode, options);
    }
  };

  /**
   * renders main div for the filmStripComponent
   * @param amxNode filmStripAmxNode
   * @param id id of the filmStrip component
   */
  filmStrip.prototype.render = function (amxNode, id)
  {
    // load all the available attributes for processing
    var orientation = amxNode.getAttribute("orientation");
    var itemSizing = amxNode.getAttribute("itemSizing");
    var valign = amxNode.getAttribute("valign");
    var halign = amxNode.getAttribute("halign");
    var shortDesc = amxNode.getAttribute("shortDesc");
    // process initially selected rowKeys and set them to the component"s state
    _processInitialSelection(amxNode);
    // prepare filmStrip"s conainer
    var rootElement = document.createElement("div");
    if (shortDesc)
    {
      rootElement.title = shortDesc;
    }
    // prepare default styleClass
    if ("stretched" === itemSizing)
    {
      rootElement.classList.add("amx-filmStrip-stretchItems");
    }

    if (orientation === "vertical")
    {
      // add information about filmStrip orientation (horizontal is by default)
      rootElement.classList.add("vertical");
    }
    if (valign)
    {
      // add information about vertical alignment of the items on the page
      rootElement.classList.add("valign-" + valign);
    }
    if (halign)
    {
      // add information about horizontal alignment of the items on the page
      rootElement.classList.add("halign-" + halign);
    }

    // create container for pages
    var container = document.createElement("div");
    rootElement.appendChild(container);

    var pageContainer = document.createElement("div");
    pageContainer.id = amxNode.getId() + "_pageContainer";
    pageContainer.className = "amx-filmStrip_page-container";
    container.appendChild(pageContainer);
    // create default event handlers for the filmStrip and attach them to the container
    this._createHandlers(amxNode, pageContainer);
    // create one page element which will be divided into more separated pages in postDisplay phase when
    // filmStrip dimensions are available
    var pageElement = document.createElement("div");
    pageElement.className = "amx-filmStrip_page";
    pageContainer.appendChild(pageElement);
    // render filmStripItem for each object from the value collection
    var dataItems = amxNode.getAttribute("value");
    var i;
    if (dataItems)
    {
      var iter = adf.mf.api.amx.createIterator(dataItems);
      while (iter.hasNext())
      {
        iter.next();
        var children = amxNode.renderDescendants(null, iter.getRowKey());
        for (i = 0; i < children.length; i++)
        {
          pageElement.appendChild(children[i]);
        }
      }
    }
    else
    {
      // render filmStripItems that are defined without any value specified
      var childrenToRender = amxNode.renderDescendants();
      for (i = 0; i < childrenToRender.length; i++)
      {
        pageElement.appendChild(childrenToRender[i]);
      }
    }

    // render page control
    this._renderPageControl(amxNode, rootElement);

    return rootElement;
  };

  /**
   * removes attached dom handlers and clear meta information about pages
   * @param rootElement dom element of the filmStrip
   * @param amxNode filmStripAmxNode
   */
  filmStrip.prototype.destroy = function (rootElement, amxNode)
  {
    // in stretching mode there is no resize listener attached to the window
    var isStretching = rootElement.classList.contains("amx-filmStrip-stretchItems");
    var deprecated = this._isFlexBoxDeprecatedImplementation();
    if (!isStretching || deprecated)
    {
      this._unregisterResizeHandler(amxNode);
    }
  };

  /**
   * To avoid too many registered resize listeners, this method
   * creates only one resize handler and creates collection
   * of AmxNodes that observes this resize changes
   * 
   * @param amxNode AmxNode that observes resize changes
   */
  filmStrip.prototype._registerResizeHandler = function(amxNode)
  {
    if (!this._resizeObservers)
    {
      var renderer = this;
      this._batchResizeHandler = function(event)
      {
        renderer._resizeObservers.forEach(function(observer)
        {
          renderer.__redistributeItems(observer);
        });
      };

      this._resizeObservers = [amxNode];
      window.addEventListener("resize", this._batchResizeHandler, true);
    }
    else
    {
      this._resizeObservers.push(amxNode);
    }
  };

  /**
   * Removes the amxNode from the observers of the resize change. In
   * case that there are no observers the real listener is removed from
   * window object.
   *
   * @param amxNode AmxNode that observes resize changes
   */
  filmStrip.prototype._unregisterResizeHandler = function(amxNode)
  {
    if (this._resizeObservers)
    {
      var newObservers = [];
      // filter listeners and create new array without the one 
      // which is being removed
      this._resizeObservers.forEach(function(node)
      {
        if (node !== amxNode)
        {
          newObservers.push(node);
        }
      });
      // set new observer or delete them all and unregister resize listener
      if (newObservers > 0)
      {
        this._resizeObservers = newObservers;
      }
      else if (this._batchResizeHandler)
      {
        delete this._resizeObservers;
        window.removeEventListener("resize", this._batchResizeHandler, true);
        delete this._batchResizeHandler;
      }
    }
  };

  var _simpleResizeHandler = function(event)
  {
    var renderer = event.data['renderer'];
    renderer.__redistributeItems(event.data['amxNode']);
  };

  /**
   * init event handlers and attach them into the dom tree
   * @param rootElement dom element of the filmStrip
   * @param amxNode filmStripAmxNode
   */
  filmStrip.prototype.init = function (rootElement, amxNode)
  {
    // cleanup after possible refresh
    amxNode.setAttributeResolvedValue("_pageChangeCause", null);
    // add listener that rerender component when resize event is triggered by the parent
    adf.mf.api.amx.addBubbleEventListener(rootElement, "resize", _simpleResizeHandler,
    {'amxNode' : amxNode, 'renderer' : this});
    // in stretching mode filmStrip doesn't need resize on the window change since
    // it doesn't need to recalculate number of pages on rotation
    var isStretching = rootElement.classList.contains("amx-filmStrip-stretchItems");
    var deprecated = this._isFlexBoxDeprecatedImplementation();
    if (!isStretching || deprecated)
    {
      this._registerResizeHandler(amxNode);
    }
  };

  filmStrip.prototype.__calculateItemsPerPage = function(amxNode)
  {
    var id = amxNode.getId();
    var rootElement = document.getElementById(id);
    var orientation = amxNode.getAttribute("orientation");
    // get the first page of the filmStrip
    var pageContainer = document.getElementById(id + "_pageContainer");
    var page = pageContainer.firstElementChild;

    var isStretching = rootElement.classList.contains("amx-filmStrip-stretchItems");

    var maxitemsPerPage = null;
    var itemsPerPage = null; 
    // number of the items that can be nested in one page
    if (amxNode.isAttributeDefined("itemsPerPage"))
    {
      maxitemsPerPage = amxNode.getAttribute("itemsPerPage");
    }

    if (!isStretching)
    {
      var cs = window.getComputedStyle(page.childNodes[0]);
      // calculate size of the item and size of the container
      if (orientation === "vertical")
      {
        // in vertical mode use height
        maxSize = rootElement.clientHeight;
        size = page.childNodes[0].offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
      }
      else
      {
        // in horizontal mode use width
        maxSize = pageContainer.parentNode.clientWidth;
        size = page.childNodes[0].offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
      }
      // The calculated size may be greater than the maxSize.  This can happen, for example, when the
      // browser window is smaller than the space used by the parent element.  Ensure size is <=
      // maxSize so the correct number of amx-filmStrip_page elements can be calculated.
      size = Math.min(size, maxSize);
      // determine number of the items on one page
      itemsPerPage = Math.floor(maxSize / size);
      if (isNaN(itemsPerPage) || isFinite(itemsPerPage) === false)
      {
        itemsPerPage = 1;
      }
    }

    if (maxitemsPerPage && itemsPerPage)
    {
      itemsPerPage = Math.min(itemsPerPage, maxitemsPerPage);
    }
    else if (maxitemsPerPage)
    {
      itemsPerPage = maxitemsPerPage;
    }
    else if (!itemsPerPage)
    {
      itemsPerPage = 1;
    }

    return itemsPerPage;
  };

  filmStrip.prototype.__redistributeItems = function(amxNode, initial)
  {
    // calculate number of items per page
    var itemsPerPage = this.__calculateItemsPerPage(amxNode);

    // store information about number of items per page to 
    // prevent unnecessary relayouts on resize.
    amxNode.setAttributeResolvedValue("__itemsPerPage", itemsPerPage);

    var pageContainer = document.getElementById(amxNode.getId() + "_pageContainer");

    var currentNodeId = null;
    // store information about the first item
    // on current page
    // in case it is initial search skip this step
    // since there is only one page present that needs 
    // to be splited to more pages
    if (!initial)
    {
      var currentPageIndex = this.getCurrentPageIndex(amxNode);
      currentNodeId = pageContainer.childNodes[currentPageIndex].firstChild.id;
    }
    // go through all pages from the start to the end 
    // and verify that these pages contains right number of items 
    // according to itemsPerPage attribute
    var page = pageContainer.firstElementChild;
    while (page)
    {
      var nextPage = page.nextElementSibling;
      if (page.childElementCount > itemsPerPage)
      {
        // there is more elements on the current page than on the next page
        // move all superfluous items on the next page
        // to asure proper order go from the end item and
        // insert all these extra items before the 
        // first item of the next page
        for (var i = page.childElementCount -1; i >= itemsPerPage; i--)
        {
          var currentChild = page.childNodes[i];
          // ignore elements marked with amx-empty
          if (!currentChild.classList.contains("amx-empty"))
          {
            if (!nextPage)
            {
              // in some cases it is necessary to create new
              // next page
              nextPage = document.createElement("div");
              nextPage.className = "amx-filmStrip_page";
              pageContainer.appendChild(nextPage);
            }

            if (nextPage.firstElementChild)
            {
              // insert to the start of the next page to ensure proper order
              nextPage.insertBefore(currentChild, nextPage.firstElementChild);
            }
            else
            {
              // next page is empty => use simple appendChild
              nextPage.appendChild(currentChild);
            }
          }
          else
          {
            // this should be empty element but 
            // to be sure use function that
            // also removes all bubbleEventListeners
            // and dispose AmxNodes
            adf.mf.api.amx.removeDomNode(currentChild);
          }
        }
      }
      else if (page.childElementCount < itemsPerPage && nextPage)
      {
        // there is more elements on the next page than on the current page
        // move the required number from the next page to the current page
        // to achieve required number of items per page
        var addition = itemsPerPage - page.childElementCount;
        for (var i = 0; i < addition; i++)
        {
          var currentChild = nextPage.firstElementChild;
          // ignore items marked as amx-empty
          if (!currentChild.classList.contains("amx-empty"))
          {
            page.appendChild(currentChild);
          }
          else
          {
            // this should be empty element but 
            // to be sure use function that
            // also removes all bubbleEventListeners
            // and dispose AmxNodes
            adf.mf.api.amx.removeDomNode(currentChild);
          }
          // in case that the page is empty filmStrip
          // just removes this page and goes to next
          // page if this exists
          if (nextPage.childNodes.length === 0)
          {
            var pageToRemove = nextPage;
            nextPage = nextPage.nextElementSibling;
            // this should be empty element but 
            // to be sure use function that
            // also removes all bubbleEventListeners
            // and dispose AmxNodes
            adf.mf.api.amx.removeDomNode(pageToRemove);
            // skip processing if there is no new page
            if (!nextPage)
            {
              break;
            }
          }
        }
      }
      // go to next page and start again
      page = nextPage;
    }
    // add empty items to get items properly distributed when alignment is justify
    page = pageContainer.lastElementChild;

    for (var y = page.childNodes.length; y < itemsPerPage; y++)
    {
      emptyItem = document.createElement("div");
      emptyItem.className = "amx-filmStripItem amx-empty";
      page.appendChild(emptyItem);
    }
    // adjust page count according to new layout
    this.__recalculatePageCount(amxNode, initial);
    // need to get initial page for changed
    // number of pages
    this.__recalculateInitialPage(amxNode, currentNodeId, initial);
  };

  filmStrip.prototype.__recalculateInitialPage = function (amxNode, currentNodeId, initial)
  {
    var newIndex = 0;
    var hasHit = false;

    var cause = amxNode.getAttribute("_pageChangeCause");
    if (!cause || cause === "displayedPageIndex")
    {
      var pageIndex = amxNode.getAttribute("displayedPageIndex");
      if (initial && pageIndex != null)
      {
        newIndex = parseInt(pageIndex);
        hasHit = true;
      }
    }

    if (!cause || cause === "displayedItemKey")
    {
      var displayedItem = amxNode.getAttribute("displayedItemKey");
      if (!hasHit && initial && displayedItem != null)
      {
        amxNode.visitChildren(new adf.mf.api.amx.VisitContext(), function (visitContext, aNode)
        {
          if (aNode.isReadyToRender() && _getStampKey(aNode) === displayedItem)
          {
            var itemElement = document.getElementById(aNode.getId());
            var pageToDisplay = itemElement.parentNode;
            if (pageToDisplay)
            {
              while (pageToDisplay.previousSibling)
              {
                newIndex++;
                pageToDisplay = pageToDisplay.previousSibling;
              }
              hasHit = true;
              return adf.mf.api.amx.VisitResult["COMPLETE"];
            }
          }
          return adf.mf.api.amx.VisitResult["REJECT"];
        });
      }
    }

    if ((!hasHit && initial) || currentNodeId)
    {
      var pageContainer = document.getElementById(amxNode.getId() + "_pageContainer");
      // create filmStripItem tree walker
      var treeWalker = document.createTreeWalker(pageContainer, NodeFilter.SHOW_ELEMENT, 
      {
        acceptNode : function (node)
        {
          // skip page container and direct children (pages) of the page container
          if (node === pageContainer || node.parentNode === pageContainer)
          {
            return NodeFilter.FILTER_SKIP;
          }
          // accept only filmStripItems
          if (node.classList.contains("amx-filmStripItem"))
          {
            return NodeFilter.FILTER_ACCEPT;
          }
          // reject all other nodes to prevent excessive tree processing
          return NodeFilter.FILTER_REJECT;
        }
      });
      // try to find page with current node which should
      // be available on the resize event
      // or page that contains the first selected node
      while (treeWalker.nextNode())
      {
        var node = treeWalker.currentNode;

        if ((currentNodeId && node.id === currentNodeId) || (!currentNodeId && node.classList.contains("adfmf-filmStripItem-selected")))
        {
          var pageToDisplay = node.parentNode;
          if (pageToDisplay)
          {
            while (pageToDisplay.previousSibling)
            {
              newIndex++;
              pageToDisplay = pageToDisplay.previousSibling;
            }
          }
          hasHit = true;
          break;
        }
      }
    }

    if (!hasHit && initial)
    {
      // there is no selection and no current node index
      // trying to get index from stored client state
      newIndex = _getPageFromClientState(amxNode);
      if (newIndex == null)
      {
        newIndex = 0;
      }
    }

    this.setCurrentPageByIndex(amxNode, newIndex);
  };

  filmStrip.prototype.__recalculatePageCount = function (amxNode, force)
  {
    var deprecated = this._isFlexBoxDeprecatedImplementation();
    force = force || deprecated;
    // get current(old) number of pages
    var oldPageCount = this.getPageCount(amxNode);
    var id = amxNode.getId();
    var pageContainer = document.getElementById(id + "_pageContainer");
    // get real number of pages in filmStrip
    var pageCount = pageContainer.childElementCount;
    // change style of the pageContainer
    // to adjust dimensions according to 
    // new pageCount
    // do this only in case that there is difference in 
    // this count
    if (force || oldPageCount !== pageCount)
    {
      var orientation = amxNode.getAttribute("orientation");
      var size;

      if (orientation === "vertical")
      {
        // get size based on the FlexBox version
        size = deprecated ? (pageCount * pageContainer.parentNode.offsetHeight) + "px" : (pageCount * 100) + "%";
        // reset previous setting
        pageContainer.style.width = "";
        pageContainer.style['min-width'] = "";
        // set new dimension constraints
        pageContainer.style.height = size;
        pageContainer.style['min-height'] = size;
      }
      else
      {
        // get size based on the FlexBox version
        size = deprecated ? (pageCount * pageContainer.parentNode.offsetWidth) + "px" : (pageCount * 100) + "%";
        // reset previous setting
        pageContainer.style.height = "";
        pageContainer.style['min-height'] = "";
        // set new dimension constraints
        pageContainer.style.width = size;
        pageContainer.style['min-width'] = size;
      }
    }

    // set meta info about the page count
    this.setPageCount(amxNode, pageCount);
  };

  /**
   * @param rootElement dom element of the filmStrip
   * @param amxNode filmStripAmxNode
   */
  filmStrip.prototype.postDisplay = function (rootElement, amxNode)
  {
    // get the first page of the filmStrip
    var pageContainer = document.getElementById(amxNode.getId() + "_pageContainer");
    if (pageContainer)
    {
      var page = pageContainer.firstElementChild;
    }

    if (page)
    {
      page.className = "amx-filmStrip_page";

      if (!page.childNodes || page.childNodes.length === 0)
      {
        return;
      }
      // distribute filmStripItems among pages
      this.__redistributeItems(amxNode, true);
    }
  };

  /**
   * In older android versions than 4.4 the -webkit-box implementation is only implementation of the FlexBox
   * this implementation needs a few hacks to get it work correctly and also it is critical to behave a little
   * differently to this implementation. The most up to date implementation uses flex or -webkit-flex anotation.
   */
  filmStrip.prototype._isFlexBoxDeprecatedImplementation = function ()
  {
    if (this._deprecated == null)
    {
      // try to use CSS object to identify supported features
      if (typeof CSS !== "undefined" && CSS.supports("(display: flex) or (display: -webkit-flex) or (display: -ms-flex)"))
      {
        // if CSS object is supported and we know that it supports flex than we can return false
        this._deprecated = false;
      }
      else
      {
        // there is no CSS object defined so test it hard way
        var testDiv = document.createElement("div");
        // try to set flex
        testDiv.style.display = "-ms-flex";
        testDiv.style.display = "-webkit-flex";
        testDiv.style.display = "flex";
        // append it to the document
        document.body.appendChild(testDiv);
        // in case that both of the values above are not supported than the value in the property
        // should be empty. Simply anyhting but one of the property above.
        this._deprecated = testDiv.style.display !== "-ms-flex" && testDiv.style.display !== "-webkit-flex" && testDiv.style.display !== "flex";
        // remove from the body
        document.body.removeChild(testDiv);
        // clean context a little
        testDiv = null;
      }
    }
    return this._deprecated;
  };

  /**
   * stores information about page index into the client state
   * @param amxNode filmStripAmxNode
   * @param pageNumber index of the selected page
   *
   */
  var _storePageState = function (amxNode, pageNumber)
  {
    var storedData = amxNode.getClientState();
    if (storedData == null)
    {
      storedData = {};
    }

    storedData["_selectedPage"] = pageNumber;

    amxNode.setClientState(storedData);
  };

  /**
   * retieves information about page index from the client state
   * @param amxNode filmStripAmxNode
   * @return index of the selected page
   *
   */
  var _getPageFromClientState = function (amxNode)
  {
    var storedData = amxNode.getClientState();
    if (storedData == null || storedData["_selectedPage"] == null)
    {
      return null;
    }

    return storedData["_selectedPage"];
  };

  /**
   * refreshes filmStrip
   *
   * @param amxNode filmStripAmxNode
   * @param attributeChanges map of the changed attributes
   */
  filmStrip.prototype.refresh = function (amxNode, attributeChanges, descendantChanges)
  {
    // handle inlineStyle and styleClass changes
    filmStrip.superclass.refresh.call(this, amxNode, attributeChanges);
    var id = amxNode.getId();
    var rootElement = document.getElementById(id);
    // in case that styles have changed or itemsPerPage attribute has changed
    // set redistribute items to true.
    // (styles can change size of the filmStrip and affects number of items
    // per page)
    var redistributeItems = attributeChanges.hasChanged("inlineStyle") 
                          || attributeChanges.hasChanged("styleClass")
                          || attributeChanges.hasChanged("itemsPerPage");
    // in some cases it is needed to relayout filmStrip event 
    // though number of items perPage has not changed
    var forceRelayout = false;

    if (attributeChanges.hasChanged("orientation"))
    {
      var orientation = amxNode.getAttribute("orientation");
      if (orientation === "vertical")
      {
        // add information about filmStrip orientation (horizontal is by default)   
        rootElement.classList.add("vertical");
      }
      else
      {
        rootElement.classList.remove("vertical");
      }
      // orientation has changed so filmStrip expects changed number of items
      // per page. In this case it is necessary to distribute filmStripItems
      // among all the pages
      redistributeItems = true;
      forceRelayout = true;
    }

    if (attributeChanges.hasChanged("itemSizing"))
    {
      var itemSizing = amxNode.getAttribute("itemSizing");
      if ("stretched" === itemSizing)
      {
        // add information about filmStrip orientation (horizontal is by default)   
        rootElement.classList.add("amx-filmStrip-stretchItems");
      }
      else
      {
        rootElement.classList.remove("amx-filmStrip-stretchItems");
      }
      // there is different algorith which distributes items
      // among pages so filmStrip has to redistribute these
      redistributeItems = true;
    }

    if (attributeChanges.hasChanged("shortDesc"))
    {
      var shortDesc = amxNode.getAttribute("shortDesc");
      if (shortDesc)
      {
        rootElement.setAttribute("title", shortDesc);
      }
      else
      {
        rootElement.removeAttribute("title");
      }
    }

    if (attributeChanges.hasChanged("valign"))
    {
      refreshAlignment(rootElement, "valign", attributeChanges.getOldValue("valign"), amxNode.getAttribute("valign"));
    }

    if (attributeChanges.hasChanged("halign"))
    {
      refreshAlignment(rootElement, "halign", attributeChanges.getOldValue("halign"), amxNode.getAttribute("halign"));
    }

    if (attributeChanges.hasChanged("value") &&
        attributeChanges.getCustomValue("bulkLoad") !== true)
    {
      var changes = attributeChanges.getCustomValue("amxNodeCollectionChanges");
      if (changes)
      {
        changes["deleted"].forEach(function(removedNode)
        {
          var removedDomNode = document.getElementById(removedNode.getId());
          // use framework method to properly
          // clean listeners and amxNode references
          adf.mf.api.amx.removeDomNode(removedDomNode);
        });

        changes["replaced"].forEach(function(replacedNode)
        {
          if (replacedNode.getAttribute("rendered") !== false)
          {
            // rerender node when rendered attribute is not false
            replacedNode.rerender();
          }
          else
          {
            // remove dom node since the rendered attribute is false
            var removedDomNode = document.getElementById(replacedNode.getId());
            // use framework method to properly
            // clean listeners and amxNode references
            adf.mf.api.amx.removeDomNode(removedDomNode);
          }
        });

        var pageContainer = document.getElementById(id + "_pageContainer");
        changes["created"].forEach(function(createdNode)
        {
          // render node only when this node can be rendered
          if (createdNode.getAttribute("rendered") !== false)
          {
            var domNode = createdNode.render();
            // append to the end of the last page
            pageContainer.lastElementChild.appendChild(domNode);
          }
        });
        // redistribute newly created items or fill empty spaces
        // after the deleted items
        redistributeItems = true;
      }
    }
    // distribute items among the pages according new 
    // parameters of filmStrip
    if (redistributeItems)
    {
      this.__redistributeItems(amxNode);
      if (forceRelayout)
      {
        this.__recalculatePageCount(amxNode, true);
      }
    }

    if (!(redistributeItems && forceRelayout) &&
      (attributeChanges.hasChanged("displayedPageIndex")
      || attributeChanges.hasChanged("displayedItemKey")))
    {
      var pageContainer = document.getElementById(id + "_pageContainer");
      enableAnimation(pageContainer.childNodes, true);
      this.__recalculateInitialPage(amxNode, null, true);
    }

    if (attributeChanges.hasChanged("pageControlPosition") || redistributeItems || forceRelayout)
    {
      // refresh page control info
      this._refreshPageControl(amxNode, attributeChanges);
    }
  };

  /**
   * Helper function that generates class name from alignment type and value. This class is then set into
   * the root element.
   */
  var refreshAlignment = function (rootElement, type, oldValue, value)
  {
    if (oldValue)
    {
      rootElement.classList.remove(type + "-" + oldValue);
    }
    if (value)
    {
      rootElement.classList.add(type + "-" + value);
    }
  };
})();
