const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType, ButtonBuilder, ButtonStyle, ActionRowBuilder, SelectMenuBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel],
});

const ALLOWED_ROLES_TO_USE_COMMAND = ['ID ADMIN'];
const TICKET_CATEGORIES = {
    "access": "ID KATEGORIE VOM TICKET",
    "support": "ID KATEGORIE VOM TICKET",
    "partner": "ID KATEGORIE VOM TICKET",
};

const ARCHIVE_CATEGORY_NAME = "KATEGORIE NAME";
const ARCHIVE_CHANNEL_NAME = "NAME VON CHANNEL";
const SERVER_TEAM_ROLE_ID = "TEAM ID FÜR PING";
const TARGET_GUILD_ID = "WELCHEN GUILD ER BEOBACHTET ID";

async function updateActivity() {
    const guild = bot.guilds.cache.get(TARGET_GUILD_ID);
    if (guild) {
        const memberCount = guild.memberCount;
        bot.user.setActivity(`${guild.name} - ${memberCount} Members`, { type: ActivityType.Watching });
    } else {
        console.log(`Server with ID ${TARGET_GUILD_ID} not found!`);
    }
    setTimeout(updateActivity, 60000);
}

bot.once('ready', () => {
    console.log(`Bot is online as ${bot.user.tag}`);
    updateActivity();
});

function hasAllowedRole(member) {
    return member.roles.cache.some(role => ALLOWED_ROLES_TO_USE_COMMAND.includes(role.id));
}

bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'send_ticket_embed') {
        if (!hasAllowedRole(interaction.member)) {
            const embed = new EmbedBuilder()
                .setTitle("Permission Denied")
                .setDescription("You are not authorized to execute this command.")
                .setColor(0xFF0000);

            try {
                await interaction.user.send({ embeds: [embed] });
            } catch {
                await interaction.reply({ content: "You are not authorized and I couldn't send you a DM.", ephemeral: true });
            }
            return;
        }

        const guildName = interaction.guild.name;
        const embed = new EmbedBuilder()
            .setTitle(`${guildName} - Tickets`)
            .setDescription("Please choose a category to create a ticket.\nA moderator will assist you shortly.")
            .setColor(0x880007)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setImage("DIRECT URL VOM BILD EINFÜGEN ODER GIF")
            .setFooter({ text: "Powered by Jonesyyy", iconURL: "https://cdn.discordapp.com/avatars/801011337274589234/a_6a0d9f2ec8a68573280eaa8b9f060c52.gif?size=1024" });

        const selectMenu = new SelectMenuBuilder()
            .setCustomId('ticket_category')
            .setPlaceholder('Choose a category')
            .addOptions(
                { label: 'Support', value: 'support', emoji: '🛠️', description: 'Receive help with problems' },
                { label: 'Access', value: 'access', emoji: '💰', description: 'Ask for access to the bot' },
                { label: 'Partner', value: 'partner', emoji: '👪', description: 'Submit a partnership request' }
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;

    if (interaction.customId === 'ticket_category') {
        const category = interaction.values[0];
        const categoryId = TICKET_CATEGORIES[category];

        const ticketCategory = interaction.guild.channels.cache.get(categoryId) || await interaction.guild.channels.create({
            name: `new ticket - ${category}`,
            type: 'GUILD_CATEGORY'
        });

        const existingChannel = ticketCategory.children.cache.find(channel => channel.name === `ticket-${interaction.user.username}`);
        if (existingChannel) {
            await interaction.reply({ content: `You already have a ticket in this category: ${existingChannel}`, ephemeral: true });
            return;
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 'GUILD_TEXT',
            parent: ticketCategory.id,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: interaction.guild.me.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: SERVER_TEAM_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("Welcome to your ticket!")
            .setDescription("A moderator will soon take care of your request.")
            .setColor(0x880007);

        const closeButton = new ButtonBuilder()
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setCustomId('close_ticket');

        const row = new ActionRowBuilder().addComponents(closeButton);

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Your ticket has been created: ${ticketChannel}`, ephemeral: true });
    }
});

bot.login("DEIN TOKEN");