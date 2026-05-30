// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/OpenPodio.sol";

contract OpenPodioTest is Test {
    OpenPodio public openPodio;
    
    address public host = address(0x9999);
    address public alice = address(0x1111);
    address public bob = address(0x2222);
    address public charlie = address(0x3333);
    
    address public candidate1 = address(0x4444);
    address public candidate2 = address(0x5555);
    address public candidate3 = address(0x6666);

    uint256 public compId;
    uint256 public durationInMinutes = 60; // 1 hour

    function setUp() public {
        openPodio = new OpenPodio();
        
        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
        vm.deal(candidate1, 10 ether);
        vm.deal(candidate2, 10 ether);
        vm.deal(candidate3, 10 ether);
    }

    function test_CreateConcurso() public {
        vm.prank(host);
        uint256 newId = openPodio.createConcurso("Demo Hackathon #1", "Una descripcion de prueba");
        
        assertEq(newId, 1);
        assertEq(openPodio.competitionCount(), 1);

        (
            uint256 id,
            string memory title,
            string memory description,
            address compHost,
            uint256 compEndTime,
            uint256 totalPool,
            address winner,
            uint256 rewardPerVoter,
            bool resolved,
            OpenPodio.State state
        ) = openPodio.competitions(newId);

        assertEq(id, 1);
        assertEq(title, "Demo Hackathon #1");
        assertEq(description, "Una descripcion de prueba");
        assertEq(compHost, host);
        assertEq(compEndTime, 0);
        assertEq(totalPool, 0);
        assertEq(winner, address(0));
        assertEq(rewardPerVoter, 0);
        assertFalse(resolved);
        assertTrue(state == OpenPodio.State.Upcoming);
    }

    function test_RegisterParticipant() public {
        vm.prank(host);
        uint256 newId = openPodio.createConcurso("Demo Hackathon #1", "Desc");

        // Register candidate 1
        vm.prank(candidate1);
        openPodio.registerParticipant(newId, candidate1, "Neon Horizons", "Pixel Forge Studios", "https://example.com/video.mp4");

        // Register candidate 2
        vm.prank(candidate2);
        openPodio.registerParticipant(newId, candidate2, "Parallel Pulse", "EVM Orchestra", "https://example.com/audio.mp3");

        assertTrue(openPodio.hasRegistered(newId, candidate1));
        assertTrue(openPodio.hasRegistered(newId, candidate2));
        assertFalse(openPodio.hasRegistered(newId, candidate3));

        assertEq(openPodio.candidateProjectName(newId, candidate1), "Neon Horizons");
        assertEq(openPodio.candidateCreatorName(newId, candidate1), "Pixel Forge Studios");
        assertEq(openPodio.candidateMediaUri(newId, candidate1), "https://example.com/video.mp4");

        address[] memory candidates = openPodio.getCandidates(newId);
        assertEq(candidates.length, 2);
        assertEq(candidates[0], candidate1);
        assertEq(candidates[1], candidate2);
    }

    function test_RevertRegisterDuplicate() public {
        vm.prank(host);
        uint256 newId = openPodio.createConcurso("Demo Hackathon #1", "Desc");

        vm.startPrank(candidate1);
        openPodio.registerParticipant(newId, candidate1, "Project 1", "Creator 1", "https://example.com/1");
        
        vm.expectRevert("Already registered");
        openPodio.registerParticipant(newId, candidate1, "Project 2", "Creator 2", "https://example.com/2");
        vm.stopPrank();
    }

    function test_StartVoting() public {
        vm.prank(host);
        uint256 newId = openPodio.createConcurso("Demo Hackathon #1", "Desc");

        vm.prank(candidate1);
        openPodio.registerParticipant(newId, candidate1, "Neon Horizons", "Pixel Forge", "https://example.com/1");
        vm.prank(candidate2);
        openPodio.registerParticipant(newId, candidate2, "Parallel Pulse", "EVM Orchestra", "https://example.com/2");

        vm.prank(host);
        openPodio.startVoting(newId, durationInMinutes);

        (,,,,,,,,,OpenPodio.State state) = openPodio.competitions(newId);
        assertTrue(state == OpenPodio.State.Active);

        (,,,,uint256 endTime,,,,,) = openPodio.competitions(newId);
        assertEq(endTime, block.timestamp + (durationInMinutes * 1 minutes));
    }

    function test_RevertStartVotingNotHost() public {
        vm.prank(host);
        uint256 newId = openPodio.createConcurso("Demo Hackathon #1", "Desc");

        vm.prank(candidate1);
        openPodio.registerParticipant(newId, candidate1, "Neon Horizons", "Pixel Forge", "https://example.com/1");
        vm.prank(candidate2);
        openPodio.registerParticipant(newId, candidate2, "Parallel Pulse", "EVM Orchestra", "https://example.com/2");

        vm.prank(alice);
        vm.expectRevert("Only the host can start voting");
        openPodio.startVoting(newId, durationInMinutes);
    }

    function test_RevertStartVotingInsufficientCandidates() public {
        vm.prank(host);
        uint256 newId = openPodio.createConcurso("Demo Hackathon #1", "Desc");

        vm.prank(candidate1);
        openPodio.registerParticipant(newId, candidate1, "Neon Horizons", "Pixel Forge", "https://example.com/1");

        vm.prank(host);
        vm.expectRevert("Must have at least two candidates to start");
        openPodio.startVoting(newId, durationInMinutes);
    }

    function test_VoteValid() public {
        vm.prank(host);
        uint256 newId = openPodio.createConcurso("Demo Hackathon #1", "Desc");

        vm.prank(candidate1);
        openPodio.registerParticipant(newId, candidate1, "Neon Horizons", "Pixel Forge", "https://example.com/1");
        vm.prank(candidate2);
        openPodio.registerParticipant(newId, candidate2, "Parallel Pulse", "EVM Orchestra", "https://example.com/2");

        vm.prank(host);
        openPodio.startVoting(newId, durationInMinutes);

        vm.prank(alice);
        openPodio.vote{value: 0.1 ether}(newId, candidate1);

        assertTrue(openPodio.hasVoted(newId, alice));
        assertEq(openPodio.voterSelection(newId, alice), candidate1);

        (,,,,,uint256 totalPool,,,,) = openPodio.competitions(newId);
        assertEq(totalPool, 0.1 ether);
    }

    function test_ResolveAndClaim() public {
        vm.prank(host);
        uint256 newId = openPodio.createConcurso("Demo Hackathon #1", "Desc");

        vm.prank(candidate1);
        openPodio.registerParticipant(newId, candidate1, "Neon Horizons", "Pixel Forge", "https://example.com/1");
        vm.prank(candidate2);
        openPodio.registerParticipant(newId, candidate2, "Parallel Pulse", "EVM Orchestra", "https://example.com/2");

        vm.prank(host);
        openPodio.startVoting(newId, durationInMinutes);

        vm.prank(alice);
        openPodio.vote{value: 0.1 ether}(newId, candidate1);

        vm.prank(bob);
        openPodio.vote{value: 0.1 ether}(newId, candidate1);

        vm.prank(charlie);
        openPodio.vote{value: 0.1 ether}(newId, candidate2);

        (,,,,uint256 endTime,,,,,) = openPodio.competitions(newId);
        vm.warp(endTime + 1);

        uint256 creatorBalanceBefore = candidate1.balance;
        openPodio.resolveCompetition(newId);

        (,,,,,,,uint256 rewardPerVoter,bool resolved, OpenPodio.State state) = openPodio.competitions(newId);
        assertTrue(resolved);
        assertTrue(state == OpenPodio.State.Ended);
        assertEq(candidate1.balance - creatorBalanceBefore, 0.24 ether); // 80% of 0.3 MONAD
        assertEq(rewardPerVoter, 0.03 ether); // 20% of 0.3 MONAD = 0.06 ether divided by 2 winning voters (Alice and Bob)

        uint256 aliceBalanceBefore = alice.balance;
        vm.prank(alice);
        openPodio.claimRewards(newId);
        assertEq(alice.balance - aliceBalanceBefore, 0.03 ether);
    }
}
