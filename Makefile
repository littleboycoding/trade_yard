build:
	cargo build-bpf --bpf-out-dir dist

test:
	cargo test-bpf
