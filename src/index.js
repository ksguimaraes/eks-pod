const express = require('express');
const bodyParser = require('body-parser');
const k8s = require("kubernetes-client");
const config = k8s.config;
const Client = k8s.Client1_13;
const Request = require("kubernetes-client/backends/request");
const app = express();
app.use(bodyParser.json());

const local = process.env.LOCAL;

app.get("/pods", async (req, res) => {
    const namespace = req.query.namespace || "";

    const client = getClient(local);
    try {
        const pods = await getPods(client);
        const podsName = extractPodsName(pods);
        res.send({
            namespace: namespace,
            pods: podsName
        });
    } catch (err) {
        res
            .status(500)
            .send({ message: `Erro ao buscar pods: ${err.message}` });
    }
});

app.delete("/pods/:namespace/:podName", async (req, res) => {
    const namespace = req.params.namespace;
    const podName = req.params.podName;

    if(!namespace) {
        return res.status(400).send({ message: "Namespace não informado" });
    }

    if(!podName) {
        return res.status(400).send({ message: "Nome do pod não informado" });
    }

    const client = getClient(local);
    try {
        await deletePod(client, namespace, podName);
        res.status(204).send();
    } catch (err) {
        res
            .status(500)
            .send({ message: `Erro ao deletar pod: ${err.message}` });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const getClient = (local = true) => {
    if(local) {
        return new Client({
            config: config.fromKubeconfig(),
            version: '1.13'
        });
    } else {
        const backend = new Request(Request.config.getInCluster());
        return new Client({ backend });
    }
};

const getPods = (client, namespace = "") => {
    return client.api.v1.namespaces(namespace).pods.get();
};

const deletePod = (client, namespace, podName) => {
    return client.api.v1.namespaces(namespace).pods(podName).delete();
};

const extractPodsName = (pods) => {
    return pods.body.items.map(pod => pod.metadata.name);
};