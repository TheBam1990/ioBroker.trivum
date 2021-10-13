"use strict";

/*
 * Created with @iobroker/create-adapter v1.31.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const convert = require("xml-js");
const axios = require("axios").default;
let devicesin;		//hilsvariable ob daten eingetragen sind oder nicht
let IP;		//IP Adresse des Gerätes
let getAllZonesURL;	//vollständige adresse für get all zone
//let getstatusnowURL;  //Aktuelle status einer Zone alles zurück geben
let getstatuschangeURL;  //nur änderungen einer Zone zurück geben
const generatedArray = [];	//erstelltes Array aus der Get all zone
let trivum_adapter;	//hilfsvariable für this.
let timedefoults;	//Timer für verzögertes rücksetzen valou
let time;		//kontrolle ob request zurück kommt wenn nicht nach 40sec. info.con. auf false
let time2;		//1sec wartezeit nach get all aufruf bis zum schreiben der variablen
const testing="1";		//prüfung für timeout request
let paging;		//wie viele durchsagen soll es geben
let ZONECMD_MUTE_ON;
let ZONECMD_MUTE_OFF;
let DEFAULT_STREAMING;
let ZONECMD_DEFAULT_TUNER;
let VOLUME;
let ZONECMD_POWER_OFF;






// Load your modules here, e.g.:
// const fs = require("fs");

class Trivum extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "trivum",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
		trivum_adapter=this;
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here
		let ALLOFF;

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		await this.setStateAsync("info.connection", {val: false, ack: true});
		//this.log.info("config adresse: " + this.config.adresse);
		this.subscribeStates("*.*");
		this.log.debug("erster step");

		if (this.config.adresse !== "") {		//abfrage ob IP eingetragen ist
			this.log.debug("config adresse: " + this.config.adresse);
			devicesin=true;						//Variable setzen wenn adresse eingetragen ist
			IP = this.config.adresse;			//werte von index als Daten übergeben
			paging = Number(this.config.option3);		//Abfrage wie viele Durchsagen es gibt
			getAllZonesURL= "http://"+IP+"/xml/zone/getAll.xml"; 	//Abfrage URL
			this.getHttpData(getAllZonesURL);		//Abfrage der Daten vom Gerät
			this.log.debug("http anfrage wird gesendet");		//Kontrolle ob anfrage raus geht
			await this.setStateAsync("info.connection", { val: true, ack: true });
			ALLOFF="http://"+IP+"/xml/zone/runCommand.xml?zone=@0&command=15";	//befehl erstellen zum ausschalten der Zonen
			this.log.debug("array erstellung gut");
		} else {
			devicesin=false;
			this.log.debug("http anfrage fehlgeschlagen");
			await this.setStateAsync("info.connection", {val: false, ack: true});
			return;
		}


		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		erstellen der Variablen
		*/
		await this.setObjectNotExistsAsync("Global.ALLOFF", {
			type: "state",
			common: {
				name: "alles_aus",
				type: "boolean",
				role: "button",
				read: false,
				write: true,
			},
			native: {
				ALLOFF
			},
		});
		await this.setObjectNotExistsAsync("Global.Aktive_zonen", {
			type: "state",
			common: {
				name: "aktiv_zone",
				type: "string",
				role: "value",
				read: true,
				write: false,
			},
			native: {
			},
		});
		/*await this.setObjectNotExistsAsync("Global.Tuner_Frequenz", {
			type: "state",
			common: {
				name: "Tuner_Frequenz",
				type: "number",
				role: "indicator",
				read: true,
				write: false,
			},
			native: {
			},
		});*/
		if(paging>0 ){
			for (var i = 0; i <= paging-1; i++) {
				var aufrufen = "http://"+IP+"/xml/paging/start.xml?id="+i;
				await this.setObjectNotExistsAsync("Global.Paging"+i, {
					type: "state",
					common: {
						name: "Paging"+i,
						type: "boolean",
						role: "button",
						read: false,
						write: true,
					},
					native: {
						aufrufen
					},
				});
			}
		}


			
		

	

		/*for (const datapoint in this.generatedArray) {
			let data;
			await this.setObjectNotExistsAsync(nameFilter(this.config.devices[datapoint].name), {
				type: "state",
				common: {
					name: this.config.devices[datapoint].name,
					type: data,
					role: "state",
					read: true,
					write: true,
				},
				native: {
					adress: this.config.devices[datapoint].value,
				},
			});

			this.subscribeStates(nameFilter(this.config.devices[datapoint].name));
		}*/

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		//#	this.subscribeStates("testVariable");
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates("lights.*");
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates("*");

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		////#	await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		////#	await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//#	await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		/*let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info("check user admin pw iobroker: " + result);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info("check group user admin group admin: " + result);*/
		//Schreiben der variablen nach dem sie erstellt wurden.
		for (const values in generatedArray) {
			await this.setStateAsync(nameFilter(generatedArray[values].description)+"."+ "Status", { val: generatedArray[values].status, ack: true });
			await this.setStateAsync(nameFilter(generatedArray[values].description)+"."+ "VOLUME", { val: generatedArray[values].volume, ack: true });
		}
		//aufrufen der Funktion die bei änderung daten schreibt
		if (devicesin === true) {
			this.readchanges();
		}

	}

	//Daten abrufen und in die Variablen schreiben
	async readchanges() {
		try {
			//getstatusnowURL= "http://"+IP+"/xml/zone/getChanges.xml?zone=@0&clientid=90&now&apilevel=3";				//"/xml/zone/getChanges.xml?visuid=90&now";
			getstatuschangeURL="http://"+IP+"/xml/zone/getChanges.xml?zone=@0&clientid=90&onlyChange&apilevel=3";			//"http://"+IP+"/xml/zone/getChanges.xml?visuid=90&onlyChanges"
			const rec = await axios.get(getstatuschangeURL);
			const returned = convert.xml2json(rec.data, {compact: true, spaces: 4});
			const result4=JSON.parse(returned);
			trivum_adapter.log.debug("read change infos "+JSON.stringify(result4));
			trivum_adapter.log.debug("Aktive Zonen "+JSON.stringify(result4.rows.system.activeZones._text));
			await this.setStateAsync("Global.Aktive_zonen", { val: result4.rows.system.activeZones._text, ack: true });
			await this.setStateAsync("info.connection", { val: true, ack: true });


			try{
				if(testing==result4.rows.system.timeout._text){
					trivum_adapter.log.debug("Timeout "+JSON.stringify(testing));
				}
			}catch (e){


				trivum_adapter.getHttpData(getAllZonesURL);
				time2=setTimeout(async function() {
					for (const values in generatedArray) {
						await trivum_adapter.setStateAsync(nameFilter(generatedArray[values].description)+"."+ "Status", { val: generatedArray[values].status, ack: true });
						await trivum_adapter.setStateAsync(nameFilter(generatedArray[values].description)+"."+ "VOLUME", { val: generatedArray[values].volume, ack: true });
						await trivum_adapter.setStateAsync("info.connection", { val: true, ack: true });
					}
				}, 1000);

			}		//kontrolle ob verbindung noch da ist ansonten connetcion lost
			trivum_adapter.setStateAsync("info.connection", { val: true, ack: true });
			clearTimeout(time);
			time = setTimeout(() => {
				trivum_adapter.setStateAsync("info.connection", { val: false, ack: true });
			}, 40000);

			this.readchanges();

		}catch (e) {
			trivum_adapter.log.error(e);
			await this.setStateAsync("info.connection", {val: false, ack: true});
			this.readchanges();
			return;
		}
	}


	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active

			clearTimeout(timedefoults);
			clearTimeout(time);
			clearTimeout(time2);

			callback();
		} catch (e) {
			callback();
		}

	}

	//Anfrage für all Zone
	async getHttpData(apiAdres){
		try {
			this.log.debug("test "+apiAdres);
			const resp = await axios.get(apiAdres);
			const result1 = convert.xml2json(resp.data, {compact: true, spaces: 4});
			//var result2 = convert.xml2json(result, {compact: false, spaces: 4});
			const result3=JSON.parse(result1);
			trivum_adapter.log.debug("result3 "+JSON.stringify(result3));
			for (const i in result3.rows.zone){

				generatedArray[i] = {
					"id" : result3.rows.zone[i].id._text,
					"status" : result3.rows.zone[i].status._text,
					"description" : result3.rows.zone[i].description._text,
					"volume" : result3.rows.zone[i].volume._text,
				};

			}
			await trivum_adapter.setStateAsync("info.connection", { val: true, ack: true });
			trivum_adapter.log.debug("länge "+generatedArray.length);
			trivum_adapter.log.debug(`erstelltes array ${JSON.stringify(generatedArray)}`);
					//Zonen mit den variablen erstellen
		// @ts-ignore
		if(generatedArray!=""){
			
			for (const test in generatedArray) {
				try {
					trivum_adapter.log.debug(`erstelltes array vor 1 erstellung ${JSON.stringify(generatedArray[test].description)}`);
					trivum_adapter.log.debug("ipadresse "+IP);
					ZONECMD_MUTE_ON ="http://"+IP+"/xml/zone/runCommand.xml?zone=@"+test+"&command=680";	
					trivum_adapter.log.debug("ZONECMD_MUTE_ON "+ZONECMD_MUTE_ON);
					ZONECMD_MUTE_OFF="http://"+IP+"/xml/zone/runCommand.xml?zone=@"+test+"&command=681";
					DEFAULT_STREAMING="http://"+IP+"/xml/zone/runCommand.xml?zone=@"+test+"&command=50";
					VOLUME="http://"+IP+"/xml/zone/runCommand.xml?zone=@"+test+"&command=9";
					ZONECMD_DEFAULT_TUNER="http://"+IP+"/xml/zone/runCommand.xml?zone=@"+test+"&command=51";
					ZONECMD_POWER_OFF="http://"+IP+"/xml/zone/runCommand.xml?zone=@"+test+"&command=1";
					this.log.debug(`erstelltes array vor erstellung ${JSON.stringify(generatedArray[test].description)}`);
	
	
					await trivum_adapter.setObjectNotExistsAsync(nameFilter(generatedArray[test].description)+".Muten", {
						type: "state",
						common: {
							name: "Mute",
							type: "boolean",
							role: "text",
							read: false,
							write: true,
						},
						native: {
							ZONECMD_MUTE_ON,
							ZONECMD_MUTE_OFF
						},
					});
	
					await this.setObjectNotExistsAsync(nameFilter(generatedArray[test].description)+".DEFAULT_STREAMING", {
						type: "state",
						common: {
							name: "DEFAULT_STREAMING",
							type: "boolean",
							role: "button",
							read: false,
							write: true,
						},
						native: {
							DEFAULT_STREAMING
						},
	
	
					});
	
					await this.setObjectNotExistsAsync(nameFilter(generatedArray[test].description)+".ZONECMD_DEFAULT_TUNER", {
						type: "state",
						common: {
							name: "ZONECMD_DEFAULT_TUNER",
							type: "boolean",
							role: "button",
							read: false,
							write: true,
						},
						native: {
							ZONECMD_DEFAULT_TUNER
						},
	
	
					});
	
					await this.setObjectNotExistsAsync(nameFilter(generatedArray[test].description)+".VOLUME", {
						type: "state",
						common: {
							name: "VOLUME",
							type: "string",
							role: "value",
							read: true,
							write: true,
						},
						native: {
							VOLUME
						},
	
	
					});
	
					await this.setObjectNotExistsAsync(nameFilter(generatedArray[test].description)+".ZONECMD_POWER_OFF", {
						type: "state",
						common: {
							name: "Zone_OFF",
							type: "boolean",
							role: "button",
							read: false,
							write: true,
						},
						native: {
							ZONECMD_POWER_OFF
						},
	
	
					});
	
					await this.setObjectNotExistsAsync(nameFilter(generatedArray[test].description)+".Status", {
						type: "state",
						common: {
							name: "Status",
							type: "string",
							role: "text",
							read: false,
							write: true,
						},
						native: {
						},
	
	
					});
	
				} catch (error) { 
					this.log.info("Error erstellung objekte "); }
				}
			}


		} catch (e) {
			trivum_adapter.log.error(e);
			await this.setStateAsync("info.connection", {val: false, ack: true});
			devicesin=false;

		}
	}
	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	//änderungen an states überwachen und zum gerät schreiben
	async onStateChange(id, state) {
		if (state && state.ack === false) {
			// The state was changed and Ack
			this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			const tmp = id.split(".");
			this.log.debug(`state ${tmp}`);
			const objName = tmp.slice(3).join(".");
			this.log.debug(`state ${objName}`);
			const obj = await this.getObjectAsync(id);

			if (obj == null) {
				this.log.error("Objekt ist null");
				return;
			}

			this.log.debug(`Objekt ${JSON.stringify(obj.native)}`);

			if (objName.startsWith("Paging")){
				if (state.val===true){
					axios(obj.native.aufrufen);
					this.valueres(id);
				}
			}

			switch(objName){

				case "Muten":
					this.log.debug(`state wurde erkannt`);
					if (state.val===true){
						axios(obj.native.ZONECMD_MUTE_ON);
						this.log.debug(`sende code ${JSON.stringify(obj.native.ZONECMD_MUTE_ON)}`);
					} else {
						axios(obj.native.ZONECMD_MUTE_OFF);
						this.log.debug(`sende code ${JSON.stringify(obj.native.ZONECMD_MUTE_OFF)}`);
					}
					break;

				case "DEFAULT_STREAMING":
					if (state.val===true){
						axios(obj.native.DEFAULT_STREAMING);
						this.valueres(id);
					}
					break;

				case "ZONECMD_DEFAULT_TUNER":
					if (state.val===true){
						this.log.debug(`Default_tuner wird ausgelöst`);
						axios(obj.native.ZONECMD_DEFAULT_TUNER);
						this.valueres(id);
					}
					break;

				case "ZONECMD_POWER_OFF":
					if (state.val===true){
						axios(obj.native.ZONECMD_POWER_OFF);
						this.valueres(id);
					}
					break;

				case "ALLOFF":
					if (state.val===true){
						axios(obj.native.ALLOFF);
						this.valueres(id);
					}
					break;

				case "VOLUME":
					if (state.val!=null && state.val<10){
						state.val="0"+state.val;
					}
					axios(obj.native.VOLUME+state.val);
					this.log.debug(`Lautstärke ausgelöst `+obj.native.VOLUME+state.val);
					break;
				

			}
		} else {
			// The state was deleted
			this.log.debug(`state ${id} zum senden wurde nicht gefunden`);
		}
	}

	async valueres (id){
		timedefoults = setTimeout(async function(){
			await trivum_adapter.setStateAsync(id, {val: false, ack: true, });
		},3000);
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

}


function nameFilter(name) {
	const signs = [String.fromCharCode(46), String.fromCharCode(44), String.fromCharCode(92), String.fromCharCode(47), String.fromCharCode(91), String.fromCharCode(93), String.fromCharCode(123), String.fromCharCode(125), String.fromCharCode(32), String.fromCharCode(129), String.fromCharCode(154), String.fromCharCode(132), String.fromCharCode(142), String.fromCharCode(148), String.fromCharCode(153)]; //46=. 44=, 92=\ 47=/ 91=[ 93=] 123={ 125=} 32=Space 129=ü 154=Ü 132=ä 142=Ä 148=ö 153=Ö
	signs.forEach((item) => {
		const count = name.split(item).length - 1;

		for (let i = 0; i < count; i++) {
			name = name.replace(item, "");
		}

		const result = name.search(/$/);
		if (result !== -1) {
			name = name.replace(/_$/, "");
		}

	});
	return name;
}




// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Trivum(options);
} else {
	// otherwise start the instance directly
	new Trivum();
}

