/**
 * Style
 * One style property.
 * 
 * Based on Overpass Turbo implementation
 * @see https://github.com/tyrasd/overpass-turbo
 */
var MapCSSStyle = function() {this.__init__()};

MapCSSStyle.prototype = {
	merged: false,
	edited: false,
	//sublayer: 5, // TODO: commented out. see RuleSet.js
	//interactive: true, // TODO: commented out. see RuleSet.js
	properties: [],
	styleType: 'Style',
	evals: null,

    __init__: function() {
    	this.evals = {};
    },

	drawn: function() {
		return false;
	},

	has: function(k) {
		return this.properties.indexOf(k)>-1;
	},
	
	mergeWith: function(additional) {
		for (var prop in this.properties) {
			if (additional[prop]) {
				this[prop]=additional[prop];
			}
		}
		this.merged=true;
	},
	
	setPropertyFromString: function(k,v,isEval) {
		this.edited=true;
		if (isEval) { this.evals[k]=v; return; }

		if (typeof(this[k])==='boolean') {
			v=Boolean(v);
		} else if (typeof(this[k])==='number') {
			v=Number(v);
		} else if (this[k] && this[k].constructor===Array) {
			v = v.split(',').map(function(a) { return Number(a); });
		}
		this[k]=v; 
		return true;
	},

	runEvals: function(tags) {
	    // helper object for eval() properties
		// eslint-disable-next-line
        var eval_functions = {
          // mapcss 0.2 eval function
          tag: function(t) {return tags[t];},
          prop: function(p) {}, // todo
          cond: function(expr, i, e) {if (expr) return i; else return e;},
          any: function() {for (var i=0;i<arguments.length;i++) if(arguments[i]) return arguments[i];},
          max: Math.max,
          min: Math.min,
          // JOSM eval functions ?
        };
		for (var k in this.evals) {
			try {
				// eslint-disable-next-line
			  this.setPropertyFromString(k, eval("with (tags) with (eval_functions) {"+this.evals[k]+"}"),false);
			} catch(e) {}
		}
	},

	toString: function() {
		var str = '';
		for (var k in this.properties) {
			if (this.hasOwnProperty(k)) { str+=k+"="+this[k]+"; "; }
		}
		return str;
	}
};

export default MapCSSStyle;
