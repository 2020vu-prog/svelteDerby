<script>
import { push, pop, replace } from "svelte-spa-router";
import { Form, FormGroup, FormText, Input, Label } from "sveltestrap";
import SpinnerButton from "./SpinnerButton.svelte";

import * as axiosVanilla  from "axios";
import { axios, raceConfig, statusMessage, userEmail } from "./stores.js";

const pbForm={}
let spinning=false
async function applyUserPw(){
    spinning=true

   // curl -v -XPOST http://10.42.0.1:5000/networks --data $'{\n  "ssid": "cjw",\n  "pw": "river222"\n}' --header 'Content-Type: application/json'
    const req = {
        ssid:pbForm.ssid,
        pw:pbForm.pw
        };

        const endpoint ="https://0.0.0.0:8081//networks"
       // const endpoint ="http://10.42.0.1:5000/networks"

        try {
            const response = await axiosVanilla.post(
                endpoint,
                req
            );
        }
        catch(e){

        }
}
</script>
<h4>Setp Timer WiFi</h4>
<Form>
    <FormGroup>
        <Label>
           SSID:
            <Input
                disabled={false}
                type="text"
                bind:value={pbForm.ssid}
            />
        </Label>
    </FormGroup>
<FormGroup>
    <Label>
        Password
        <Input
            disabled={false}
            type="text"
            bind:value={pbForm.pw}
        />
        <FormText color="muted">
        </FormText>
    </Label>
</FormGroup>
</Form>

<SpinnerButton
on:click={applyUserPw}
{spinning}
>
Apply
</SpinnerButton>
