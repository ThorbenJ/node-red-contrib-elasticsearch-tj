module.exports = function(RED) {
    
    const U = require("../utils");
    const Y = require("yaml");
    const M = require("mustache");
    M.escape = function (t) { return JSON.stringify(t) };

    function Create(n) {
        RED.nodes.createNode(this,n);
        this.conn = RED.nodes.getNode(n.connection);
        this.conf = n;
        var node = this;
   
        this.on('input', function(msg) {

            var params = {
                index: M.render(n.index, msg),
                id: M.render(n.docId, msg),
                body: M.render(n.content, msg)
            };

            for (var k in params) {
                if (! params[k])
                    delete params[k]
            }

            try {
                params.body = Y.parse(params.body);
            } catch (e) {
                node.warn(e)
            };
            
            if (!U.keyHasValue(node, params, 'index')) return;
            if (!U.keyHasValue(node, params, 'id')) return;
            
            const client = node.conn.client();
            client.create(params).then(function (res) {
                node.send([{...msg, ...{
                    esDocId: res._id,
                    esIndex: res._index,
                    esDocVer: res._version,
                    esResult: res.result
                }}, {
                    esStatus: "created",
                    payload: {
                        info: "created new document",
                        docId: res._id,
                        index: res._index,
                        docVer: res._version,
                        result: res.result,
                        created: res.result==='created'?true:false,
                        shards: res._shards
                    }
                }]);
                
            }, function (err) {
                node.send([null, {
                    esStatus: "failed",
                    payload: {
                        info: "es-doccreate request failed",
                        error: err
                    }
                }]);
                node.warn("es-doc-create request failed")
            });

        });
    }
    RED.nodes.registerType("es-doc-create",Create);
};
