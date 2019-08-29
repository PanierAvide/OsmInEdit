/**
 * Condition
 * A condition is a boolean test in style selector.
 * 
 * Based on Overpass Turbo implementation
 * @see https://github.com/tyrasd/overpass-turbo
 */
var MapCSSCondition = function() {};
MapCSSCondition.prototype = {
	type: '',				// eq/ne/regex etc.
	params: [],				// what to test against

	init:function(_type) {
		this.type  =_type;
		this.params=Array.prototype.slice.call(arguments,1);
                return this;
	},
	
	test:function(tags) {
		// summary:		Run the condition against the supplied tags.
		var p=this.params;
		switch (this.type) {
			case 'eq':		return (tags[p[0]]===p[1]);
			case 'ne':		return (tags[p[0]]!==p[1]);
			case 'regex':	var r=new RegExp(p[1],"i");
							return (r.test(tags[p[0]]));
			case 'true':	return (tags[p[0]]==='true' || tags[p[0]]==='yes' || tags[p[0]]==='1');
			case 'false':	return (tags[p[0]]==='false' || tags[p[0]]==='no' || tags[p[0]]==='0');
			case 'set':		return (tags[p[0]] !== undefined && tags[p[0]]!=='');
			case 'unset':	return (tags[p[0]] === undefined || tags[p[0]]==='');
			case '<':		return (Number(tags[p[0]])< Number(p[1]));
			case '<=':		return (Number(tags[p[0]])<=Number(p[1]));
			case '>':		return (Number(tags[p[0]])> Number(p[1]));
			case '>=':		return (Number(tags[p[0]])>=Number(p[1]));
			default:
				return false;
		}
	},
	
	toString:function() {
		return "["+this.type+": "+this.params+"]";
	}
};

export default MapCSSCondition;
