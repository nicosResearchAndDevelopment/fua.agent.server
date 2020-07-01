module['exports'] = (config) => {

    let
        server     = null, //!!! single instance...
        _listening = false,

        metrics    = new Map()
    ; // let

    //region fn

    function start_running(PEP, server, status, running, property, heartbeat) {

        return new Promise((resolve, reject) => {
            try {
                status  = "running";
                running = true;
                if (heartbeat['cpu_usage_per_second'])
                    _heartbeat_cpu_usage_fn(server, property['cpu_usage'], PEP, handle, heartbeat['cpu_usage_per_second']);

            } catch (jex) {
                reject(jex);
            } // try
        }); // return P

    } // function start_running()

    function pause_running(server, status) {
        status = "paused";

    } // function pause_running()

    function stop_running(server, running, status) {
        status  = "stopped";
        running = false;
    } // function stop_running()

    function _heartbeat_cpu_usage_fn(server, cpu_usage, PEP, handle, beatPerSecond) {

        handle = setTimeout(
            function () {
                //Grab second Measure
                let
                    endMeasure      = cpuAverage(),
                    //Calculate the difference in idle and total time between the measures
                    idleDifference  = endMeasure.idle - startMeasure.idle,
                    totalDifference = endMeasure.total - startMeasure.total,
                    //Calculate the average percentage CPU usage
                    percentageCPU   = 100 - ~~(100 * idleDifference / totalDifference)
                ;

                //Output result to console
                //console.log(percentageCPU + "% CPU Usage.");
                cpu_usage['fua:sts']['@value']   = hrt();
                cpu_usage['fua:vts']['@value']   = hrt();
                cpu_usage['fua:value']['@value'] = percentageCPU;

                PEP.enforce({
                    '@id':       `urn:app:event:broadcast:send`,
                    'prov':      "router.gbx.data:Server:cpu_usage:_heartbeat_fn",
                    'parameter': {'resource': _srv_cpu_usage_}
                }).then(result => {
                    result;
                }).catch(err => {
                    err;
                });

                _heartbeat_fn();
            }, // fn

            (1000 * (1 / beatPerSecond))
        ); // setTimeout()

    } // _heartbeat_fn_handle()

    //endregion fn

    class Server {

        #id        = null;
        #os        = null;
        #hrt       = null;
        #root      = ":";
        #running   = false;
        #run_since = -1;
        #status    = "dead";
        #space     = null;
        #PEP       = null;

        #heartbeat = null;

        #cpus      = [];
        #cpu_usage = -1;

        constructor({
                        'os':        os = null
                        ,
                        'space':     space,
                        'PEP':       PEP
                        ,
                        '@id':       id = null,
                        'root':      root,
                        'hrt':       hrt = () => (Date.now()) / 1000,
                        'heartbeat': heartbeat
                    }) {
            //error first
            if (server !== null)
                throw new Error('Server : server already set');

            this.#id        = id;
            this.#os        = os;
            this.#hrt       = hrt;
            this.#root      = root;
            this.#space     = space;
            this.#PEP       = PEP;

            this.#heartbeat = heartbeat;

            let
                _id_
            ;

            os.cpus().forEach((item, index, array) => {
                _id_ = `${id}cpu_${index}`;
                space.set({
                    '@id':           _id_,
                    '@type':         ["gbx:Cpu", "rdfs:Resource"],
                    'rdfs:label':    `cpu_${index}`,
                    'gbx:cpu_model': {'@type': "xsd:string", '@value': item['model']},
                    'gbx:cpu_speed': {'@type': "xsd:decimal", '@value': item['speed']}
                });
                this.#cpus.push(space.get(_id_));
            });

            _id_ = `${id}cpu_usage`;
            space.set({
                '@id':        `${_id_}`,
                '@type':      "fua:DataProperty",
                'rdfs:label': [{'@language': "en", '@value': "cpu usage"}],
                'fua:sts':    {'@type': "xsd:decimal", '@value': -1},
                'fua:vts':    {'@type': "xsd:decimal", '@value': -1},
                'fua:value':  {'@type': "xsd:decimal", '@value': -1}
            });
            this.#cpu_usage = space.get(_id_);

            //TODO: clean from OLD opcua stuff...
            Object.defineProperties(this, {
                '@id':   {value: this.#id},
                '@type': {value: Server['@id']},

                'cpu_usage': {get: () => this.#cpu_usage},
                'root':      {get: () => this.#root},
                'running':   {get: () => this.#running},
                'runSince':  {get: () => this.#run_since},
                'run':       {
                    value: () => {

                        return new Promise((resolve, reject) => {
                            try {

                                let
                                    err    = null,
                                    result = {
                                        'ts': this.#hrt(),
                                        'm':  undefined
                                    }
                                ;

                                start_running(
                                    /** server */ this,
                                    this.#status,
                                    this.#running,
                                    /** property */ {
                                        'cpu_usage': this.#cpu_usage
                                    },
                                    this.#heartbeat
                                ).then((result) => {
                                    resolve(result);
                                }).catch((err) => {
                                    reject(err);
                                });

                                //this.#running     = true;
                                //result['message'] = `${new Date().toISOString()} : Server is running.`;
                                //if (callback) {
                                //    callback(err, result);
                                //} // if ()
                            } catch (jex) {
                                reject(jex);
                            } // try
                        }); // return P

                    } // value
                } // run
            });

            if (this['__proto__']['constructor']['name'] === "Server") {
                Object.seal(this);
            } // if ()

        } // constructor()

    } // class Server

    Object.defineProperties(Server, {
        '@id':   {value: "fua:Server"},
        '@type': {value: "rdfs:Class"}
    });

    Object.seal(Server);

    server = new Server(config);

    return server;

};
