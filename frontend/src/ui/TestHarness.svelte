<script>
    // Renders the ui components together the way the app uses them, so the specs
    // can drive slots, bindings and callbacks through real Svelte.
    import {
        Badge,
        Button,
        Card,
        CardBody,
        CardFooter,
        CardHeader,
        CardTitle,
        Collapse,
        Form,
        FormGroup,
        FormText,
        Input,
        Label,
        Modal,
        ModalBody,
        ModalFooter,
        ModalHeader,
        Table,
    } from "./index.js";

    export let modalOpen = false;
    export let collapseOpen = false;
    export let text = "hello";
    export let seq = 3;
    export let flavor = "b";
    export let on = false;
    export let clicks = [];
    // Bound values and the toggle count, mirrored here so the specs can read
    // them without reading props off the component instance.
    export let state = {};
    let toggles = 0;
    $: state.text = text;
    $: state.seq = seq;
    $: state.flavor = flavor;
    $: state.on = on;
    $: state.toggles = toggles;
    const toggle = () => {
        toggles += 1;
        modalOpen = !modalOpen;
    };
</script>

<Badge pill class="bigText" style="background: red">badge</Badge>
<Button color="primary" size="sm" on:click={() => clicks.push("button")}>go</Button>
<Button disabled>off</Button>
<Card class="mt-3 border border-info" style="color: red" on:click={() => clicks.push("card")}>
    <CardHeader class="bg-info text-white">header</CardHeader>
    <CardBody>
        <CardTitle>title</CardTitle>
        body
    </CardBody>
    <CardFooter class="bg-info">footer</CardFooter>
</Card>
<Form>
    <FormGroup>
        <Label>
            Name
            <Input type="text" bind:value={text} placeholder="p" />
            <FormText color="muted">help</FormText>
        </Label>
        <Label>
            Seq
            <Input type="number" bind:value={seq} />
        </Label>
        <Label>
            Flavor
            <Input type="select" bind:value={flavor}>
                <option value="a">A</option>
                <option value="b">B</option>
            </Input>
        </Label>
    </FormGroup>
    <FormGroup check>
        <Label check for="gps">
            <Input type="checkbox" class="big" bind:checked={on} />
            Gps
        </Label>
    </FormGroup>
</Form>
<Table striped bordered size="sm"><tbody><tr><td>cell</td></tr></tbody></Table>
<Collapse isOpen={collapseOpen}>collapsed content</Collapse>
<Modal isOpen={modalOpen} toggle={toggle}>
    <ModalHeader toggle={toggle}>Modal title</ModalHeader>
    <ModalBody>modal body</ModalBody>
    <ModalFooter>modal footer</ModalFooter>
</Modal>
